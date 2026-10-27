import { QwenClient } from "@opencode/core/qwen/client"
import { Effect, Result } from "effect"
import { HttpClient } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"

/**
 * Connectivity probe for the local Qwen endpoint. Runs only when the client
 * explicitly requests it and sends one small bounded request. The API key
 * travels in the payload and is never echoed or logged.
 */
export const QwenHandler = HttpApiBuilder.group(Api, "server.qwen", (handlers) =>
  handlers.handle(
    "qwen.test",
    Effect.fn(function* (ctx) {
      const http = yield* HttpClient.HttpClient
      const started = performance.now()
      const result = yield* QwenClient.chat({
        http,
        config: {
          base_url: ctx.payload.base_url,
          model: ctx.payload.model,
          ...(ctx.payload.api_key === undefined ? {} : { apiKey: ctx.payload.api_key }),
          timeoutMs: ctx.payload.timeout_ms ?? 20_000,
          maxOutputTokens: 32,
        },
        request: {
          system: "You are a connectivity probe for a local inference endpoint.",
          user: "Reply with the single word: ok",
          maxOutputTokens: 32,
        },
      }).pipe(Effect.result)

      if (Result.isFailure(result))
        return { ok: false, model: ctx.payload.model, error: result.failure.message }
      return {
        ok: true,
        model: ctx.payload.model,
        latency_ms: Math.round(performance.now() - started),
        ...(result.success.usage.input === undefined && result.success.usage.output === undefined
          ? {}
          : {
              usage: {
                ...(result.success.usage.input === undefined ? {} : { input: result.success.usage.input }),
                ...(result.success.usage.output === undefined ? {} : { output: result.success.usage.output }),
              },
            }),
      }
    }),
  ),
)
