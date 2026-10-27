import { expect, test } from "bun:test"
import { Model } from "@opencode/schema/model"
import { Money } from "@opencode/schema/money"
import { Option, Schema } from "effect"
import { Routing } from "@opencode/core/routing/service"
import { RoutingPolicy } from "@opencode/core/routing/policy"
import type { Candidate } from "@opencode/core/routing/policy"

const ref = (id: string, provider = "deepseek") => Model.Ref.parse(`${provider}/${id}`)

const candidate = (tier: RoutingPolicy.Tier, id: string, inputCost = 0, contextLimit = 200_000): Candidate => ({
  ref: ref(id),
  tier,
  inputCost,
  outputCost: inputCost * 2,
  contextLimit,
})

const candidates = (input: Partial<Record<RoutingPolicy.Tier, Candidate>>) => input

const evidence = (input: Partial<RoutingPolicy.Evidence>): RoutingPolicy.Evidence => ({
  task: "bounded-code",
  complexity: "low",
  estimatedInputTokens: 2_000,
  riskElevated: false,
  ...input,
})

const budget = (input: Partial<RoutingPolicy.Budget>): RoutingPolicy.Budget => ({
  localEnabled: true,
  localFailures: 0,
  routineFailures: 0,
  localMax: 2,
  routineMax: 2,
  localUnhealthy: false,
  routineUnhealthy: false,
  proUnhealthy: false,
  ...input,
})

const select = (input: {
  preference?: RoutingPolicy.Preference
  candidates?: Partial<Record<RoutingPolicy.Tier, Candidate>>
  evidence?: Partial<RoutingPolicy.Evidence>
  budget?: Partial<RoutingPolicy.Budget>
}) =>
  RoutingPolicy.selectRoute({
    preference: input.preference ?? "balanced",
    candidates: input.candidates ?? candidates({}),
    evidence: evidence(input.evidence ?? {}),
    budget: budget(input.budget ?? {}),
  })

const pool = () =>
  candidates({
    local: candidate("local", "qwen3-8", 0),
    routine: candidate("routine", "deepseek-v4-flash", 0.15),
    pro: candidate("pro", "deepseek-v4-pro", 0.66),
  })

test("coding work runs on the local tier", () => {
  const route = select({ candidates: pool() })
  expect(route?.tier).toBe("local")
  expect(route?.ref.id).toEqual(Model.ID.make("qwen3-8"))
})

test("security-sensitive tasks escalate straight to pro", () => {
  const route = select({ candidates: pool(), evidence: { task: "security" } })
  expect(route?.tier).toBe("pro")
  expect(route?.reasons.some((reason) => /security/.test(reason))).toBe(true)
})

test("elevated-risk tasks fall back to routine when pro is unavailable", () => {
  const route = select({ candidates: candidates({ routine: candidate("routine", "flash", 0.15) }), evidence: { riskElevated: true } })
  expect(route?.tier).toBe("routine")
  expect(route?.reasons.some((reason) => /falling back/.test(reason))).toBe(true)
})

test("architectural decisions route to pro", () => {
  const route = select({ candidates: pool(), evidence: { task: "architecture" } })
  expect(route?.tier).toBe("pro")
})

test("difficult debugging routes to pro, ordinary debugging to routine", () => {
  expect(select({ candidates: pool(), evidence: { task: "debug", complexity: "high" } })?.tier).toBe("pro")
  expect(select({ candidates: pool(), evidence: { task: "debug", complexity: "low" } })?.tier).toBe("routine")
  expect(select({ candidates: pool(), evidence: { task: "debug", complexity: "low" }, preference: "quality-first" })?.tier).toBe(
    "pro",
  )
})

test("cost-first prefers the local tier for bounded low-complexity work", () => {
  const route = select({ candidates: pool(), preference: "cost-first" })
  expect(route?.tier).toBe("local")
})

test("balanced delegates coding work to the local tier and keeps planning on routine", () => {
  expect(select({ candidates: pool(), evidence: { task: "bounded-code", complexity: "high" } })?.tier).toBe("local")
  expect(select({ candidates: pool(), evidence: { task: "tests" } })?.tier).toBe("local")
  expect(select({ candidates: pool(), evidence: { task: "refactor" } })?.tier).toBe("local")
  // Planning, analysis, review, and control stay on the routine tier.
  expect(select({ candidates: pool(), evidence: { task: "analysis" } })?.tier).toBe("routine")
  // A local tier that does not fit the request or ran out of attempts falls back to routine.
  expect(
    select({
      candidates: candidates({ ...pool(), local: candidate("local", "qwen3-8", 0, 8_000) }),
      evidence: { task: "bounded-code", estimatedInputTokens: 20_000 },
    })?.tier,
  ).toBe("routine")
  expect(select({ candidates: pool(), budget: { localFailures: 2 } })?.tier).toBe("routine")
})

test("quality-first avoids the local tier while routine is eligible", () => {
  expect(select({ candidates: pool(), preference: "quality-first" })?.tier).toBe("routine")
})

test("quality-first falls back to the local tier when routine is unavailable", () => {
  const route = select({
    candidates: candidates({ local: candidate("local", "qwen3-8"), pro: candidate("pro", "pro") }),
    preference: "quality-first",
  })
  expect(route?.tier).toBe("local")
})

test("two failed routine attempts escalate to pro", () => {
  const route = select({ candidates: pool(), budget: { routineFailures: 2, localFailures: 2 } })
  expect(route?.tier).toBe("pro")
  expect(route?.reasons.some((reason) => /attempt budget/.test(reason))).toBe(true)
  // Routine exhausted but local still eligible: escalation only skips the failed tier.
  expect(select({ candidates: pool(), budget: { routineFailures: 2 } })?.tier).toBe("local")
})

test("two failed local attempts skip the local tier", () => {
  expect(select({ candidates: pool(), preference: "cost-first", budget: { localFailures: 2 } })?.tier).toBe("routine")
})

test("a lower budget is not exhausted after one failure", () => {
  expect(
    select({ candidates: pool(), evidence: { complexity: "moderate" }, budget: { routineFailures: 1 } })?.tier,
  ).toBe("local")
  expect(select({ candidates: pool(), preference: "cost-first", budget: { localFailures: 1 } })?.tier).toBe("local")
})

test("unhealthy tiers are excluded even when cheapest", () => {
  expect(select({ candidates: pool(), preference: "cost-first", budget: { localUnhealthy: true } })?.tier).toBe("routine")
  // Routine unhealthy: balanced routing falls back to the eligible local tier.
  expect(select({ candidates: pool(), budget: { routineUnhealthy: true } })?.tier).toBe("local")
  expect(select({ candidates: pool(), budget: { routineUnhealthy: true, localUnhealthy: true } })?.tier).toBe("pro")
})

test("a local candidate that exceeds its context budget is not eligible", () => {
  const route = select({
    candidates: candidates({
      local: candidate("local", "qwen3-8", 0, 8_000),
      routine: candidate("routine", "flash", 0.15),
    }),
    preference: "cost-first",
    evidence: { estimatedInputTokens: 20_000 },
  })
  expect(route?.tier).toBe("routine")
})

test("reduced pool: only local candidate serves bounded tasks", () => {
  const route = select({
    candidates: candidates({ local: candidate("local", "qwen3-8") }),
    evidence: { task: "analysis" },
  })
  expect(route?.tier).toBe("local")
})

test("reduced pool: general tasks do not use the local tier alone", () => {
  const route = select({
    candidates: candidates({ local: candidate("local", "qwen3-8"), pro: candidate("pro", "pro") }),
    evidence: { task: "general" },
  })
  expect(route?.tier).toBe("pro")
})

test("no eligible candidates yields no route", () => {
  expect(select({ candidates: candidates({ local: candidate("local", "qwen3-8") }), evidence: { task: "security" } })).toBeUndefined()
  expect(select({ candidates: candidates({}) })).toBeUndefined()
})

test("local routing is disabled when localEnabled is false", () => {
  expect(select({ candidates: pool(), preference: "cost-first", budget: { localEnabled: false } })?.tier).toBe("routine")
})

test("route diagnostics name the tier and mark estimates", () => {
  const route = select({ candidates: pool() })
  expect(route?.reasons.length).toBeGreaterThan(0)
  expect(route?.estimates).toBe(true)
})

test("task classification is deterministic and keyword-based", () => {
  expect(RoutingPolicy.classifyTask("fix the failing test in session.test.ts").task).toBe("debug")
  expect(RoutingPolicy.classifyTask("explain how the compaction module works").task).toBe("analysis")
  expect(RoutingPolicy.classifyTask("write unit tests for the router").task).toBe("tests")
  expect(RoutingPolicy.classifyTask("refactor the model resolver into smaller modules").task).toBe("refactor")
  expect(RoutingPolicy.classifyTask("redesign the session architecture for clustering").task).toBe("architecture")
  expect(RoutingPolicy.classifyTask("audit the auth flow for vulnerabilities").task).toBe("security")
  expect(RoutingPolicy.classifyTask("add a new config option").task).toBe("bounded-code")
})

test("destructive operations mark risk elevated", () => {
  expect(RoutingPolicy.classifyTask("delete all rows from the production database").riskElevated).toBe(true)
  expect(RoutingPolicy.classifyTask("add a helper function").riskElevated).toBe(false)
})

test("catalog discovery orders by cost for unset roles and never hardcodes IDs", () => {
  const { discoverCandidates } = Routing
  const cost = (input: number) => [
    {
      input: Money.USDPerMillionTokens.make(input),
      output: Money.USDPerMillionTokens.make(input),
      cache: { read: Money.USDPerMillionTokens.make(0), write: Money.USDPerMillionTokens.make(0) },
    },
  ]
  const model = (provider: string, id: string, input: number, family?: string): Routing.CatalogModel => ({
    providerID: provider,
    id,
    modelID: id,
    ...(family === undefined ? {} : { family }),
    cost: cost(input),
    limit: { context: 200_000, output: 32_000 },
  })
  const available = [
    model("deepseek", "deepseek-v4-pro", 0.66, "deepseek-thinking"),
    model("deepseek", "deepseek-v4-flash", 0.15, "deepseek-flash"),
    model("deepseek", "deepseek-v4-flash-vision-exp", 0.2, "deepseek-flash"),
  ]
  const settings = Option.getOrThrow(Schema.decodeUnknownOption(Routing.Settings)({ enabled: true }))

  // Routine = cheapest flash-family model; pro = most expensive non-flash.
  const discovered = discoverCandidates(settings, undefined, available)
  expect(discovered.routine?.ref.id).toEqual(Model.ID.make("deepseek-v4-flash"))
  expect(discovered.pro?.ref.id).toEqual(Model.ID.make("deepseek-v4-pro"))

  // The local tier comes only from the qwen config reference.
  const withLocal = discoverCandidates(
    settings,
    { provider: "qwen-local", model: "qwen3-8-125b" },
    [...available, model("qwen-local", "qwen3-8-125b", 0)],
  )
  expect(withLocal.local?.ref.id).toEqual(Model.ID.make("qwen3-8-125b"))

  // Explicit roles win over discovery; the short string form decodes to the catalog identity.
  const explicitSettings = Option.getOrThrow(
    Schema.decodeUnknownOption(Routing.Settings)({ enabled: true, roles: { pro: "deepseek/deepseek-v4-flash" } }),
  )
  const explicit = discoverCandidates(explicitSettings, undefined, available)
  expect(explicit.pro?.ref.id).toEqual(Model.ID.make("deepseek-v4-flash"))
})

test("routing settings decode with safe defaults and metadata overrides merge", () => {
  const decode = (input: unknown) => Option.getOrUndefined(Schema.decodeUnknownOption(Routing.Settings)(input))
  expect(decode({ enabled: true })).toEqual({
    enabled: true,
    preference: "balanced",
    escalate_pinned: false,
    local_enabled: true,
    diagnostics: true,
    attempts: { local: 2, routine: 2 },
    roles: {},
  })
  const overridden = decode({
    enabled: true,
    preference: "cost-first",
    attempts: { local: 3 },
    roles: { routine: "deepseek/deepseek-v4-flash" },
  })
  expect(overridden?.preference).toBe("cost-first")
  expect(overridden?.attempts.local).toBe(3)
  expect(overridden?.attempts.routine).toBe(2)
  expect(overridden?.roles.routine?.model).toEqual(Model.ID.make("deepseek-v4-flash"))
  // Invalid preferences are rejected rather than coerced.
  expect(decode({ preference: "cheapest" })).toBeUndefined()
})

test("session routing metadata overrides only the settings it names", () => {
  const base = Option.getOrThrow(
    Schema.decodeUnknownOption(Routing.Settings)({
      enabled: true,
      preference: "cost-first",
      diagnostics: false,
      attempts: { local: 1, routine: 4 },
      roles: { routine: "deepseek/deepseek-flash" },
    }),
  )

  expect(Routing.overrideSettings(base, { enabled: true })).toEqual(base)
  expect(Routing.overrideSettings(base, undefined)).toEqual(base)

  const merged = Routing.overrideSettings(base, { preference: "quality-first", attempts: { local: 3 } })
  expect(merged.preference).toBe("quality-first")
  expect(merged.attempts).toEqual({ local: 3, routine: 4 })
  expect(merged.diagnostics).toBe(false)
  expect(merged.roles.routine?.model).toEqual(Model.ID.make("deepseek-flash"))
})

test("only an explicit session routing override outranks a pinned model", () => {
  expect(Routing.explicitRouting({ metadata: { "opencode.routing": { enabled: true } } })).toBe(true)
  expect(Routing.explicitRouting({ metadata: { "opencode.routing": { preference: "quality-first" } } })).toBe(false)
  expect(Routing.explicitRouting({})).toBe(false)
})
