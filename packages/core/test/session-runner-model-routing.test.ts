import { expect } from "bun:test"
import { LanguageModel } from "@opencode/ai"
import { OpenAIChat } from "@opencode/ai/protocols"
import { DateTime, Effect, Layer } from "effect"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Location } from "@opencode/core/location"
import { Model } from "@opencode/core/model"
import { ModelResolver } from "@opencode/core/model-resolver"
import { Routing } from "@opencode/core/routing/service"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { Provider } from "@opencode/schema/provider"
import { Project } from "@opencode/schema/project"
import { Session } from "@opencode/schema/session"
import { Money } from "@opencode/schema/money"
import { AbsolutePath } from "@opencode/schema/schema"
import { testEffect } from "./lib/effect"

const runtime = (id: string) => LanguageModel.make({ id, provider: "test-provider", route: OpenAIChat.route })

const resolved = (id: string) =>
  SessionRunnerModel.resolved(runtime(id), {
    capabilities: { tools: true, input: ["text"], output: ["text"] },
    cost: [],
    limit: { context: 100, output: 20 },
  })

const model = (id: string) =>
  Model.Info.make({
    id: Model.ID.make(id),
    modelID: Model.ID.make(id),
    providerID: Provider.ID.make("test-provider"),
    name: id,
    capabilities: { tools: true, input: ["text"], output: ["text"] },
    variants: [],
    time: { released: 0 },
    cost: [],
    status: "active",
    enabled: true,
    limit: { context: 100, output: 20 },
  })

const pinned = Model.Ref.make({ providerID: Provider.ID.make("test-provider"), id: Model.ID.make("pinned") })

const session = (input: { model?: Session.Info["model"]; metadata?: Session.Info["metadata"] } = {}) =>
  Session.Info.make({
    id: Session.ID.make("ses_model_routing"),
    projectID: Project.ID.global,
    cost: Money.USD.zero,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: DateTime.makeUnsafe(0), updated: DateTime.makeUnsafe(0) },
    location: Location.Ref.make({ directory: AbsolutePath.make("/project") }),
    ...input,
  })

let route: ReturnType<typeof resolved> | undefined
let consulted: Session.Info[] = []

const it = testEffect(
  AppNodeBuilder.build(SessionRunnerModel.node, [
    ModelResolver.node.replace(
      Layer.succeed(ModelResolver.Service, {
        resolve: () => Effect.succeed(resolved("default")),
        resolveModel: (selected) => Effect.succeed(resolved(selected.id)),
      }),
    ),
    Routing.node.replace(
      Layer.succeed(Routing.Service, {
        resolve: (current) =>
          Effect.sync(() => {
            consulted.push(current)
            return route
          }),
        record: () => Effect.void,
        recordSuccess: () => Effect.void,
        lastRoute: () => Effect.succeed(undefined),
        enabled: () => Effect.succeed(true),
      }),
    ),
    Location.node.replace(Location.boundNode({ directory: AbsolutePath.make("/project") })),
  ]),
)

it.effect("routing runs for a pinned session that explicitly enabled it", () =>
  Effect.gen(function* () {
    route = resolved("routed")
    consulted = []
    const models = yield* SessionRunnerModel.Service
    const result = yield* models.resolve(
      session({ model: pinned, metadata: { "opencode.routing": { enabled: true } } }),
      () => Effect.succeed([model("pinned")]),
    )

    expect(consulted).toHaveLength(1)
    expect(result.ref.id).toEqual(Model.ID.make("routed"))
  }),
)

it.effect("honors a pinned model when routing declines", () =>
  Effect.gen(function* () {
    route = undefined
    consulted = []
    const models = yield* SessionRunnerModel.Service
    const result = yield* models.resolve(session({ model: pinned }), () => Effect.succeed([model("pinned")]))

    expect(consulted).toHaveLength(1)
    expect(result.ref.id).toEqual(Model.ID.make("pinned"))
  }),
)

it.effect("falls back to the default model for an unpinned session when routing declines", () =>
  Effect.gen(function* () {
    route = undefined
    const models = yield* SessionRunnerModel.Service
    const result = yield* models.resolve(session(), () => Effect.succeed([]))

    expect(result.ref.id).toEqual(Model.ID.make("default"))
  }),
)
