import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"

export const QwenGroup = HttpApiGroup.make("server.qwen")
  .add(
    HttpApiEndpoint.post("qwen.test", "/api/experimental/qwen/test", {
      payload: Schema.Struct({
        base_url: Schema.String,
        model: Schema.String,
        api_key: Schema.optional(Schema.String),
        timeout_ms: Schema.optional(Schema.Number),
      }),
      success: Schema.Struct({
        ok: Schema.Boolean,
        model: Schema.String,
        latency_ms: Schema.optional(Schema.Number),
        usage: Schema.optional(
          Schema.Struct({
            input: Schema.optional(Schema.Number),
            output: Schema.optional(Schema.Number),
          }),
        ),
        error: Schema.optional(Schema.String),
      }),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "qwen.test",
        summary: "Test the local Qwen endpoint",
        description:
          "Sends one small bounded Chat Completions request to the configured OpenAI-compatible endpoint. Secrets are never echoed.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "qwen", description: "Local Qwen endpoint utilities." }))
