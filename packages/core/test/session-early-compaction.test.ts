import { expect } from "bun:test"
import { LLMClient, LLMEvent, LanguageModel, ToolDefinition, type LLMRequest } from "@opencode/ai"
import { OpenAIChat } from "@opencode/ai/protocols"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { llmClient } from "@opencode/core/effect/app-node-platform"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Credential } from "@opencode/core/credential"
import { SessionCompaction } from "@opencode/core/session/compaction"
import { SessionMessage } from "@opencode/core/session/message"
import { SessionModelRequest } from "@opencode/core/session/model-request"
import { PluginHooks } from "@opencode/core/plugin/hooks"
import { SessionProjector } from "@opencode/core/session/projector"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { SessionTable } from "@opencode/core/session/sql"
import { SessionStore } from "@opencode/core/session/store"
import { Session } from "@opencode/core/session"
import { Location } from "@opencode/core/location"
import { Project } from "@opencode/core/project"
import { ProjectTable } from "@opencode/core/project/sql"
import { Agent } from "@opencode/core/agent"
import { AbsolutePath } from "@opencode/core/schema"
import { Money } from "@opencode/schema/money"
import { DateTime, Effect, Layer, Schema, Stream } from "effect"
import { testEffect } from "./lib/effect"

let requests: LLMRequest[] = []
const model = LanguageModel.make({
  id: "summary-model",
  provider: "test",
  route: OpenAIChat.route,
})
const cost = [
  {
    input: Money.USDPerMillionTokens.make(1),
    output: Money.USDPerMillionTokens.make(2),
    cache: {
      read: Money.USDPerMillionTokens.make(0.1),
      write: Money.USDPerMillionTokens.make(0.5),
    },
  },
]
const client = Layer.mock(LLMClient.Service)({
  stream: (request: LLMRequest) => {
    requests.push(request)
    return Stream.make(
      LLMEvent.textDelta({ id: "summary", text: "## Objective\n- early summary" }),
      LLMEvent.stepFinish({
        index: 0,
        reason: { normalized: "stop" },
        usage: { inputTokens: 15, outputTokens: 6, nonCachedInputTokens: 10 },
      }),
      LLMEvent.finish({ reason: { normalized: "stop" } }),
    )
  },
  generate: () => Effect.die("unused"),
})
const resolved = SessionRunnerModel.resolved(model, {
  capabilities: { tools: true, input: ["text", "image"], output: ["text"] },
  cost,
  limit: { context: 200_000, output: 32_000 },
})
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([
      Database.node,
      Bus.node,
      SessionProjector.node,
      SessionStore.node,
      SessionCompaction.node,
      SessionModelRequest.node,
      PluginHooks.node,
      Config.node,
      Credential.node,
    ]),
    [
      Bus.node.replace(Bus.configured({ persist: true })),
      llmClient.replace(client),
      Location.node.replace(Location.boundNode({ directory: AbsolutePath.make("/project") })),
      Config.node.replace(Config.testLayer([])),
    ],
  ),
)

const insertSession = (id: Session.ID) =>
  Effect.gen(function* () {
    const db = (yield* Database.Service).db
    yield* db
      .insert(ProjectTable)
      .values({ id: Project.ID.global, worktree: AbsolutePath.make("/project"), sandboxes: [] })
      .onConflictDoNothing()
      .run()
      .pipe(Effect.orDie)
    yield* db
      .insert(SessionTable)
      .values({ id, project_id: Project.ID.global, slug: id, directory: "/project", title: id, version: "test" })
      .run()
      .pipe(Effect.orDie)
    const store = yield* SessionStore.Service
    return yield* store
      .get(id)
      .pipe(Effect.flatMap((session) => (session ? Effect.succeed(session) : Effect.die(`session missing: ${id}`))))
  })

/** Two exchanges: the first is removable, the last assistant finished cleanly. */
const exchanges = (): SessionMessage.Info[] => {
  const user = (id: string, text: string) =>
    SessionMessage.User.make({ id: SessionMessage.ID.make(id), type: "user", text, time: { created: DateTime.makeUnsafe(0) } })
  const assistant = (id: string, text = "Implementation done and verified.", finished = true) =>
    Schema.decodeUnknownSync(SessionMessage.Assistant)({
      id: SessionMessage.ID.make(id),
      type: "assistant",
      agent: Agent.defaultID,
      model: { id: "summary-model", providerID: "test" },
      content: [{ type: "text", text }],
      ...(finished ? { finish: "stop" as const } : {}),
      tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: 0, completed: 0 },
    })
  return [
    user("msg_user_1", "First task: add the config option"),
    assistant("msg_assistant_1"),
    user("msg_user_2", "Second task: write the test"),
    assistant("msg_assistant_2"),
  ]
}

const loaded = (session: Session.Info, messages: readonly SessionMessage.Info[]) => ({
  session,
  messages,
  model: resolved,
  agent: { id: Agent.defaultID, info: Agent.Info.default(Agent.defaultID) },
  initial: "Session instructions",
  tools: { definitions: [] as ToolDefinition[], execute: () => Effect.die("Compaction must not execute tools") },
})

type Early = Partial<{
  enabled: boolean
  minTokens: number
  minBenefitTokens: number
  cooldownMs: number
  requireTaskBoundary: boolean
  localSummarize: boolean
}>

const configure = (early: Early) =>
  Effect.gen(function* () {
    const compaction = yield* SessionCompaction.Service
    yield* compaction.transform((editor) => editor.configure({ early }))
  })

const storeMessages = (id: Session.ID) =>
  Effect.gen(function* () {
    const store = yield* SessionStore.Service
    return yield* store.context(id).pipe(Effect.orElseSucceed(() => []))
  })

it.effect("early compaction is skipped while disabled", () =>
  Effect.gen(function* () {
    const session = yield* insertSession(Session.ID.make("ses_early_disabled"))
    const compaction = yield* SessionCompaction.Service
    const outcome = yield* compaction.compact({ reason: "early", context: loaded(session, exchanges()) })
    expect(outcome).toEqual({ status: "skipped" })
    expect((yield* storeMessages(session.id)).some((message) => message.type === "compaction")).toBe(false)
  }),
)

it.effect("early compaction summarizes below the context limit and reports estimates", () =>
  Effect.gen(function* () {
    requests = []
    const session = yield* insertSession(Session.ID.make("ses_early_completed"))
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1, cooldownMs: 0, requireTaskBoundary: true })
    const compaction = yield* SessionCompaction.Service
    const outcome = yield* compaction.compact({ reason: "early", context: loaded(session, exchanges()) })
    expect(outcome.status).toBe("completed")
    const stored = yield* storeMessages(session.id)
    const checkpoint = stored.find((message) => message.type === "compaction")
    expect(checkpoint !== undefined && checkpoint.type === "compaction" && checkpoint.status).toBe("completed")
    const diagnostic = stored.find((message) => message.type === "synthetic")
    expect(diagnostic !== undefined && diagnostic.type === "synthetic" && diagnostic.text).toContain("Early compaction")
    expect(diagnostic !== undefined && diagnostic.type === "synthetic" && diagnostic.text).toContain("estimates")
  }),
)

it.effect("early compaction honors the cooldown window", () =>
  Effect.gen(function* () {
    const session = yield* insertSession(Session.ID.make("ses_early_cooldown"))
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1, cooldownMs: 60_000, requireTaskBoundary: true })
    const compaction = yield* SessionCompaction.Service
    const context = loaded(session, exchanges())
    expect((yield* compaction.compact({ reason: "early", context })).status).toBe("completed")
    const afterFirst = yield* storeMessages(session.id)
    expect((yield* compaction.compact({ reason: "early", context })).status).toBe("skipped")
    expect((yield* storeMessages(session.id)).length).toBe(afterFirst.length)
  }),
)

it.effect("early compaction waits for task boundaries unless relaxed", () =>
  Effect.gen(function* () {
    const session = yield* insertSession(Session.ID.make("ses_early_boundary"))
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1, cooldownMs: 0, requireTaskBoundary: true })
    const compaction = yield* SessionCompaction.Service
    const midStep = exchanges().slice(0, -1).concat([
      Schema.decodeUnknownSync(SessionMessage.Assistant)({
        id: SessionMessage.ID.make("msg_assistant_running"),
        type: "assistant",
        agent: Agent.defaultID,
        model: { id: "summary-model", providerID: "test" },
        content: [{ type: "text", text: "working" }],
        time: { created: 0 },
      }),
    ])
    expect((yield* compaction.compact({ reason: "early", context: loaded(session, midStep) })).status).toBe("skipped")
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1, cooldownMs: 0, requireTaskBoundary: false })
    expect((yield* compaction.compact({ reason: "early", context: loaded(session, midStep) })).status).toBe("completed")
  }),
)

it.effect("early compaction skips when the removable prefix is too small to justify summarizing", () =>
  Effect.gen(function* () {
    const session = yield* insertSession(Session.ID.make("ses_early_benefit"))
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1_000_000, cooldownMs: 0 })
    const compaction = yield* SessionCompaction.Service
    expect(yield* compaction.compact({ reason: "early", context: loaded(session, exchanges()) })).toEqual({ status: "skipped" })
    expect((yield* storeMessages(session.id)).some((message) => message.type === "compaction")).toBe(false)
  }),
)

it.effect("early local summarization without a configured endpoint leaves context intact", () =>
  Effect.gen(function* () {
    const session = yield* insertSession(Session.ID.make("ses_early_local"))
    yield* configure({ enabled: true, minTokens: 1, minBenefitTokens: 1, cooldownMs: 0, localSummarize: true })
    const compaction = yield* SessionCompaction.Service
    expect(yield* compaction.compact({ reason: "early", context: loaded(session, exchanges()) })).toEqual({ status: "skipped" })
    expect((yield* storeMessages(session.id)).some((message) => message.type === "compaction")).toBe(false)
  }),
)
