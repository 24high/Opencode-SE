export * as Routing from "./service.js"

import { makeLocationNode } from "@opencode/util/effect/app-node"
import { ConfigQwen } from "@opencode/schema/config/qwen"
import { ConfigModel } from "@opencode/schema/config/model"
import { Provider } from "@opencode/schema/provider"
import { Context, Effect, Layer, Option, Predicate, Schema } from "effect"
import { Bus } from "../bus.js"
import { Config } from "../config.js"
import { Model } from "../model.js"
import { ModelResolver } from "../model-resolver.js"
import { SessionEvent } from "../session/event.js"
import { SessionMessage } from "../session/message.js"
import { SessionStore } from "../session/store.js"
import { Session } from "@opencode/schema/session"
import { Token } from "../util/token.js"
import { RoutingPolicy, type Candidate } from "./policy.js"

export interface Route {
  readonly ref: Model.Ref
  readonly tier: RoutingPolicy.Tier
  readonly reasons: readonly string[]
  readonly estimates: boolean
}

export interface Interface {
  /**
   * Resolves a routed model for a session. Returns undefined when routing is
   * disabled, when no eligible candidate exists, or when a pinned model must be
   * honored; the caller falls back to default model resolution.
   */
  readonly resolve: (
    session: Session.Info,
    available: () => Effect.Effect<ReadonlyArray<Model.Info>>,
  ) => Effect.Effect<ModelResolver.Resolved | undefined>
  /** Records a step failure, availability-classified or not, for later routing decisions. */
  readonly record: (sessionID: Session.ID, model: Model.Ref, error: { readonly type: string }) => Effect.Effect<void>
  /** Clears per-tier failure counts for the model that just completed a step. */
  readonly recordSuccess: (sessionID: Session.ID, model: Model.Ref) => Effect.Effect<void>
  /** Returns the last route published for a session, if any. */
  readonly lastRoute: (sessionID: Session.ID) => Effect.Effect<Route | undefined>
  /** Whether the orchestrator instructions should be injected for this session. */
  readonly enabled: (session: Session.Info) => Effect.Effect<boolean>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Routing") {}

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
export const Settings = Schema.Struct({
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  preference: Schema.Literals(["cost-first", "balanced", "quality-first"]).pipe(
    Schema.withDecodingDefault(Effect.succeed("balanced" as const)),
  ),
  escalate_pinned: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  local_enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  /** Re-classify every Step from the steps already settled in the turn, so one turn can mix tiers. */
  step_routing: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  diagnostics: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  attempts: Schema.Struct({
    local: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(2))),
    routine: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(2))),
  }).pipe(Schema.withDecodingDefault(Effect.succeed({ local: 2, routine: 2 }))),
  roles: Schema.Struct({
    local: ConfigModel.Selection.pipe(Schema.optional),
    routine: ConfigModel.Selection.pipe(Schema.optional),
    pro: ConfigModel.Selection.pipe(Schema.optional),
  }).pipe(Schema.withDecodingDefault(Effect.succeed({}))),
})

/** Session-metadata override keys set by the desktop setup wizard. */
export const METADATA_ROUTING = "opencode.routing"
export const METADATA_QWEN = "opencode.qwen"

/** Availability failures that route around a model for a bounded cooldown. */
const AVAILABILITY = new Set([
  "provider.rate-limit",
  "provider.auth",
  "provider.quota",
  "provider.transport",
  "provider.internal",
  "provider.timeout",
  "provider.no-route",
])

/** User interruptions must never count as model failures. */
const INTERRUPTED = new Set(["aborted", "interrupted", "compaction.interrupted"])

const UNAVAILABLE_MS = 60_000
const MAX_SESSIONS = 512

type SessionState = {
  route: Route | undefined
  failures: Record<string, number>
  unhealthy: Record<string, number>
}

const refKey = (ref: Model.Ref) => `${ref.providerID}/${ref.id}`
const tierKey = (tier: RoutingPolicy.Tier) => tier

const defaultSettings = (): Settings => ({
  enabled: false,
  preference: "balanced",
  escalate_pinned: false,
  local_enabled: true,
  step_routing: true,
  diagnostics: true,
  attempts: { local: 2, routine: 2 },
  roles: {},
})

const decode = Schema.decodeUnknownOption(Settings)

/**
 * Applies a session's routing metadata over the configured settings. Only the
 * settings the metadata names are replaced: decoding the raw value against the
 * full schema would otherwise reset configured preferences and roles to their
 * defaults, and nested attempts and roles keep their configured entries.
 */
export const overrideSettings = (base: Settings, raw: unknown): Settings => {
  const next = Option.getOrUndefined(decode(raw))
  if (!next) return base
  if (!Predicate.isObject(raw)) return next
  return {
    ...base,
    ...(raw.enabled === undefined ? {} : { enabled: next.enabled }),
    ...(raw.preference === undefined ? {} : { preference: next.preference }),
    ...(raw.escalate_pinned === undefined ? {} : { escalate_pinned: next.escalate_pinned }),
    ...(raw.local_enabled === undefined ? {} : { local_enabled: next.local_enabled }),
    ...(raw.step_routing === undefined ? {} : { step_routing: next.step_routing }),
    ...(raw.diagnostics === undefined ? {} : { diagnostics: next.diagnostics }),
    attempts: mergeAttempts(base.attempts, raw.attempts, next.attempts),
    roles: mergeRoles(base.roles, raw.roles, next.roles),
  }
}

function mergeAttempts(
  base: Settings["attempts"],
  raw: unknown,
  next: Settings["attempts"],
): Settings["attempts"] {
  if (!Predicate.isObject(raw)) return base
  return {
    local: raw.local === undefined ? base.local : next.local,
    routine: raw.routine === undefined ? base.routine : next.routine,
  }
}

function mergeRoles(base: Settings["roles"], raw: unknown, next: Settings["roles"]): Settings["roles"] {
  if (!Predicate.isObject(raw)) return base
  return {
    ...(raw.local === undefined ? { local: base.local } : { local: next.local }),
    ...(raw.routine === undefined ? { routine: base.routine } : { routine: next.routine }),
    ...(raw.pro === undefined ? { pro: base.pro } : { pro: next.pro }),
  }
}

const metadataOverride = (session: Session.Info) => session.metadata?.[METADATA_ROUTING]

/**
 * A session-level routing override is the client's explicit Auto choice. It
 * outranks a pinned model, while configuration-level routing never does.
 */
export const explicitRouting = (session: { readonly metadata?: Session.Info["metadata"] }) => {
  const raw = session.metadata?.[METADATA_ROUTING]
  return Predicate.isObject(raw) && raw.enabled === true
}

/** The catalog shape discovery reads; `Model.Info` satisfies it structurally. */
export interface CatalogModel {
  readonly providerID: string
  readonly id: string
  readonly modelID: string
  readonly family?: string
  readonly cost: Model.Info["cost"]
  readonly limit: { readonly context: number; readonly input?: number; readonly output: number }
}

/**
 * Resolves role candidates from explicit config roles or catalog discovery.
 * Never hardcodes model IDs: for DeepSeek, the cheapest active "flash" family
 * model is the routine tier and the most expensive active non-flash model is
 * the pro tier. The local tier comes from the `qwen` config reference.
 */
export const discoverCandidates = (
  settings: Settings,
  qwen: { readonly provider?: string; readonly model?: string } | undefined,
  available: ReadonlyArray<CatalogModel>,
): Partial<Record<RoutingPolicy.Tier, Candidate>> => {
  const candidate = (info: CatalogModel, tier: RoutingPolicy.Tier): Candidate => ({
    ref: Model.Ref.make({ providerID: Provider.ID.make(info.providerID), id: Model.ID.make(info.id) }),
    tier,
    inputCost: finiteCost(info.cost)?.input ?? 0,
    outputCost: finiteCost(info.cost)?.output ?? 0,
    contextLimit: info.limit.input || info.limit.context || 0,
  })
  const find = (role: ConfigModel.Selection | undefined) =>
    role === undefined
      ? undefined
      : available.find((model) => model.providerID === role.providerID && model.id === role.model)

  const explicit = {
    local: find(settings.roles.local),
    routine: find(settings.roles.routine),
    pro: find(settings.roles.pro),
  }

  const deepseek = available.filter((model) => model.providerID === "deepseek")
  const routineInfo =
    explicit.routine ??
    deepseek
      .filter((model) => model.family?.startsWith("deepseek-flash"))
      .toSorted((a, b) => (finiteCost(a.cost)?.input ?? 0) - (finiteCost(b.cost)?.input ?? 0))[0]
  const proInfo =
    explicit.pro ??
    deepseek
      .filter((model) => !model.family?.startsWith("deepseek-flash"))
      .toSorted((a, b) => (finiteCost(b.cost)?.input ?? 0) - (finiteCost(a.cost)?.input ?? 0))[0]
  const localInfo =
    explicit.local ??
    (qwen?.provider !== undefined && qwen.model !== undefined
      ? available.find(
          (model) => model.providerID === qwen.provider && (model.id === qwen.model || model.modelID === qwen.model),
        )
      : undefined)

  const candidates: Partial<Record<RoutingPolicy.Tier, Candidate>> = {}
  if (routineInfo) candidates.routine = candidate(routineInfo, "routine")
  if (proInfo) candidates.pro = candidate(proInfo, "pro")
  if (localInfo) candidates.local = candidate(localInfo, "local")
  return candidates
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    const catalog = yield* Model.Service
    const resolver = yield* ModelResolver.Service
    const store = yield* SessionStore.Service
    const config = yield* Config.Service

    const states = new Map<Session.ID, SessionState>()
    // Tier of a model is catalog-wide, so pin handling works without a route.
    const modelTier = new Map<string, RoutingPolicy.Tier>()

    const state = (sessionID: Session.ID): SessionState => {
      const existing = states.get(sessionID)
      if (existing) return existing
      if (states.size >= MAX_SESSIONS) {
        const oldest = states.keys().next().value
        if (oldest !== undefined) states.delete(oldest)
      }
      const created: SessionState = { route: undefined, failures: {}, unhealthy: {} }
      states.set(sessionID, created)
      return created
    }

    const readSettings = Effect.fnUntraced(function* (
      session: Session.Info | undefined,
    ): Effect.fn.Return<Settings> {
      const entries = yield* config.entries()
      const configured = Config.latest(entries, "routing")
      const fromConfig = Option.getOrUndefined(decode(configured))
      const base = fromConfig ?? defaultSettings()
      return session === undefined ? base : overrideSettings(base, metadataOverride(session))
    })

    const readQwen = Effect.fnUntraced(function* (session: Session.Info): Effect.fn.Return<ConfigQwen.Info | undefined> {
      const entries = yield* config.entries()
      const configured = Config.latest(entries, "qwen")
      const fromMetadata = session.metadata?.[METADATA_QWEN]
      const decoded =
        fromMetadata === undefined
          ? undefined
          : Option.getOrUndefined(Schema.decodeUnknownOption(ConfigQwen.Info)(fromMetadata))
      return decoded === undefined ? configured : decoded
    })

    const discover = (
      settings: Settings,
      qwen: ConfigQwen.Info | undefined,
      available: ReadonlyArray<Model.Info>,
    ): Partial<Record<RoutingPolicy.Tier, Candidate>> => {
      const candidates = discoverCandidates(settings, qwen, available)
      for (const tier of Object.keys(candidates) as RoutingPolicy.Tier[]) {
        const entry = candidates[tier]
        if (entry) modelTier.set(refKey(entry.ref), tier)
      }
      return candidates
    }

    const tierBudgetExceeded = (current: SessionState, tier: RoutingPolicy.Tier, settings: Settings) => {
      const max = tier === "local" ? settings.attempts.local : settings.attempts.routine
      return (current.failures[tierKey(tier)] ?? 0) >= max
    }

    return Service.of({
      enabled: Effect.fn("Routing.enabled")((session) => readSettings(session).pipe(Effect.map((s) => s.enabled))),
      resolve: Effect.fn("Routing.resolve")(function* (session, available) {
        const settings = yield* readSettings(session)
        if (!settings.enabled) return
        const current = state(session.id)

        // A pinned model is honored unless escalation is explicitly enabled and
        // the pinned tier has exhausted its attempt budget. An explicit session
        // routing override (the client's Auto choice) routes even a session that
        // carries a model; configuration alone never overrides a pin.
        if (session.model && !explicitRouting(session)) {
          if (!settings.escalate_pinned) return
          const tier = modelTier.get(refKey(session.model))
          if (tier === undefined || !tierBudgetExceeded(current, tier, settings)) return
        }

        const qwen = yield* readQwen(session)
        const candidates = discover(settings, qwen, yield* available())
        const history = yield* store.context(session.id).pipe(Effect.orElseSucceed(() => []))
        const route = RoutingPolicy.selectRoute({
          preference: settings.preference as RoutingPolicy.Preference,
          candidates,
          evidence: routeEvidence(history, settings.step_routing),
          budget: {
            localEnabled: settings.local_enabled,
            localFailures: current.failures[tierKey("local")] ?? 0,
            routineFailures: current.failures[tierKey("routine")] ?? 0,
            localMax: settings.attempts.local,
            routineMax: settings.attempts.routine,
            localUnhealthy: isUnhealthy(current, "local"),
            routineUnhealthy: isUnhealthy(current, "routine"),
            proUnhealthy: isUnhealthy(current, "pro"),
          },
        })
        if (!route) return

        const info = yield* catalog.get(route.ref.providerID, route.ref.id)
        if (!info) return
        const resolved = yield* resolver.resolveModel(info).pipe(Effect.orElseSucceed(() => undefined))
        if (!resolved) return

        const previous = current.route
        current.route = route
        if (settings.diagnostics && (previous === undefined || refKey(previous.ref) !== refKey(route.ref)))
          yield* bus.publish(SessionEvent.Synthetic, {
            sessionID: session.id,
            text: `Routing: ${route.ref.providerID}/${route.ref.id} (${route.tier}) — ${route.reasons.join("; ")}.${route.estimates ? " Costs are catalog prices; token figures are estimates." : ""}`,
          })
        return resolved
      }),
      record: Effect.fn("Routing.record")(function* (sessionID, model, error) {
        if (INTERRUPTED.has(error.type)) return
        // Only provider-level step failures are evidence about the model; tool,
        // permission, and configuration failures say nothing about its tier.
        if (!error.type.startsWith("provider.")) return
        const current = state(sessionID)
        const tier = modelTier.get(refKey(model))
        if (tier === undefined) return
        // Cooldowns are tracked per tier, which is how eligibility reads them: a
        // rate-limited routine model routes around the routine tier, not only
        // around that exact model id.
        if (AVAILABILITY.has(error.type)) {
          current.unhealthy[tierKey(tier)] = Date.now() + UNAVAILABLE_MS
          return
        }
        current.failures[tierKey(tier)] = (current.failures[tierKey(tier)] ?? 0) + 1
      }),
      recordSuccess: Effect.fn("Routing.recordSuccess")(function* (sessionID, model) {
        const current = state(sessionID)
        const tier = modelTier.get(refKey(model))
        if (tier !== undefined) current.failures[tierKey(tier)] = 0
      }),
      lastRoute: Effect.fn("Routing.lastRoute")((sessionID) => Effect.succeed(state(sessionID).route)),
    })
  }),
)

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [Bus.node, Config.node, Model.node, ModelResolver.node, SessionStore.node],
})

// ———— helpers ————

const finiteCost = (costs: Model.Info["cost"] | undefined) => costs?.find((cost) => cost.tier === undefined) ?? costs?.[0]

/**
 * Reads what the current turn has already done so each Step is classified from
 * its own position instead of only from the user's request. The turn starts
 * after the latest user message, so compaction, synthetic, and system records
 * never look like steps.
 */
export const stepSignals = (messages: ReadonlyArray<SessionMessage.Info>): RoutingPolicy.StepSignals => {
  const turn = messages.slice(messages.findLastIndex((message) => message.type === "user") + 1)
  const steps = turn.filter((message): message is SessionMessage.Assistant => message.type === "assistant")
  const tools = (message: SessionMessage.Assistant) =>
    message.content.filter((part): part is SessionMessage.AssistantTool => part.type === "tool")
  const failed = (message: SessionMessage.Assistant) => tools(message).some((tool) => tool.state.status === "error")
  const previous = steps.at(-1)
  let failureStreak = 0
  for (let index = steps.length - 1; index >= 0 && failed(steps[index]); index--) failureStreak += 1
  return {
    previousFailures: previous === undefined ? 0 : tools(previous).filter((tool) => tool.state.status === "error").length,
    failureStreak,
    executed: steps.some((step) => tools(step).some((tool) => RoutingPolicy.EXECUTION_TOOLS.has(tool.name))),
  }
}

/**
 * Builds the routing evidence for the next Step. `stepRouting` re-classifies the
 * request from the settled steps; without it every Step of a turn keeps the tier
 * chosen from the user's request.
 */
const routeEvidence = (messages: ReadonlyArray<SessionMessage.Info>, stepRouting: boolean): RoutingPolicy.Evidence => {
  const text = messages.filter((message) => message.type === "user").at(-1)?.text ?? ""
  // Every step resends the conversation, so the context budget must cover the
  // whole request, not only the latest user message. The fixed overhead stands
  // in for the system prompt and tool schemas.
  const history = messages.reduce((total, message) => total + Token.estimate("text" in message ? (message.text ?? "") : ""), 0)
  const estimatedInputTokens = Math.max(history, Token.estimate(text)) + 512
  const classified = RoutingPolicy.classifyTask(text)
  return {
    ...(stepRouting ? RoutingPolicy.classifyStep(classified, stepSignals(messages)) : classified),
    estimatedInputTokens,
  }
}

const isUnhealthy = (state: SessionState, tier: RoutingPolicy.Tier) => {
  const until = state.unhealthy[tierKey(tier)]
  return until !== undefined && until > Date.now()
}
