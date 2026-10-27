export * as QwenTool from "./qwen.js"

import path from "path"
import type { Context } from "@opencode/plugin/effect/plugin"
import { ToolFailure } from "@opencode/ai"
import { Effect, Result, Schema } from "effect"
import { HttpClient } from "effect/http"
import { Config } from "../../config.js"
import { Credential } from "../../credential.js"
import { Location } from "../../location.js"
import { Permission } from "../../permission.js"
import { QwenClient } from "../../qwen/client.js"
import { AbsolutePath } from "../../schema.js"
import { ReadToolFileSystem } from "../read-filesystem.js"

export const name = "delegate_to_local_qwen"

export const description = `Delegate a bounded task to the locally hosted Qwen model through its OpenAI-compatible API.
Use for bounded code analysis, implementation proposals, refactors, test generation, and reproducible fixes when the configured endpoint is healthy and the task fits the local context budget.
The tool only returns analysis and proposed changes; it cannot modify files, run tests, or execute tools. The primary agent must apply and verify every change itself.
Requires the \`qwen\` config section (base_url, model, and optional settings).`

export const Input = Schema.Struct({
  task: Schema.String.annotate({ description: "The bounded task to delegate" }),
  context: Schema.optionalKey(Schema.String).annotate({
    description: "Relevant context the local model cannot get itself",
  }),
  files: Schema.optionalKey(Schema.String.pipe(Schema.Array)).annotate({
    description: "Project-relative file paths to include as context (bounded)",
  }),
  constraints: Schema.optionalKey(Schema.String).annotate({ description: "Constraints the result must respect" }),
  acceptance_criteria: Schema.optionalKey(Schema.String).annotate({
    description: "Criteria the primary agent will use to accept the result",
  }),
  expected_output: Schema.optionalKey(Schema.String).annotate({
    description: "Shape of the expected response, e.g. 'a unified diff'",
  }),
})

export const Output = Schema.Struct({
  model: Schema.String,
  usage: Schema.Union([
    Schema.Struct({
      input: Schema.optionalKey(Schema.Number),
      output: Schema.optionalKey(Schema.Number),
    }),
    Schema.Literal("unavailable"),
  ]),
  analysis: Schema.String,
  changes_applied: Schema.Literal(false),
  tests_executed: Schema.Literal(false),
  tests_confirmed: Schema.Literal(false),
  note: Schema.String,
})

export const SYSTEM_PROMPT = `You are a local assistant model (Qwen) running inside OpenCode. A primary agent delegates bounded tasks to you. Respond with a complete, self-contained analysis and, where the task asks for it, a concrete implementation proposal (code or unified patch). You cannot modify files, run tests, or execute tools; the primary agent applies and verifies everything. Clearly separate what you analyzed, what you propose, and what you could not verify. Keep the response focused; prefer exact identifiers, paths, commands, and code over prose.`

const MAX_FILE_CHARS = 12_000
const MAX_FILES = 6

const retryable = (reason: QwenClient.QwenError["reason"]) =>
  reason === "rate-limit" || reason === "timeout" || reason === "http" || reason === "connection"

// One bounded retry on transient failures; context-length, auth, and malformed
// responses are never resent.
export const attempt = (http: HttpClient.HttpClient, config: QwenClient.Settings, user: string) =>
  Effect.gen(function* () {
    const send = () =>
      QwenClient.chat({
        http,
        config,
        request: {
          system: SYSTEM_PROMPT,
          user,
        },
      })
    const first = yield* send().pipe(Effect.result)
    if (Result.isSuccess(first)) return first.success
    if (!(first.failure instanceof QwenClient.QwenError) || !retryable(first.failure.reason))
      return yield* Effect.fail(first.failure)
    yield* Effect.sleep("1 second")
    return yield* send()
  })

const buildUser = (input: typeof Input.Type, files: ReadonlyArray<{ path: string; content: string }>) => {
  const sections = [`Task:\n${input.task}`]
  if (input.context) sections.push(`Context:\n${input.context}`)
  if (files.length > 0)
    sections.push(
      `Files:\n${files.map((file) => `### ${file.path}\n${file.content}`).join("\n\n")}`,
    )
  if (input.constraints) sections.push(`Constraints:\n${input.constraints}`)
  if (input.acceptance_criteria) sections.push(`Acceptance criteria:\n${input.acceptance_criteria}`)
  if (input.expected_output) sections.push(`Expected output:\n${input.expected_output}`)
  return sections.join("\n\n")
}

export const buildResult = (settings: QwenClient.Settings, response: QwenClient.Response) => {
  const usage =
    response.usage.input === undefined && response.usage.output === undefined
      ? ("unavailable" as const)
      : {
          ...(response.usage.input === undefined ? {} : { input: response.usage.input }),
          ...(response.usage.output === undefined ? {} : { output: response.usage.output }),
        }
  return {
    model: settings.model,
    usage,
    analysis: response.content,
    changes_applied: false as const,
    tests_executed: false as const,
    tests_confirmed: false as const,
    note: "Local Qwen returned analysis only. No files were changed and no tests were run by this tool; the primary agent must apply and verify the result.",
  }
}

export const Plugin = {
  id: "opencode.tool.qwen",
  effect: Effect.fn("QwenTool.Plugin")(function* (ctx: Context) {
    const config = yield* Config.Service
    const credentials = yield* Credential.Service
    const http = yield* HttpClient.HttpClient
    const location = yield* Location.Service
    const permission = yield* Permission.Service
    const files = yield* ReadToolFileSystem.Service

    yield* ctx.tool
      .transform((editor) =>
        editor.add({
          name,
          options: { codemode: false },
          description,
          input: Input,
          output: Output,
          execute: (input, context) =>
            Effect.gen(function* () {
              const settings = yield* QwenClient.loadSettings(config, credentials)
              if (!settings)
                return yield* Effect.fail(
                  new ToolFailure({
                    message:
                      "Local Qwen endpoint is not configured. Set the `qwen` section in config (base_url, model, and optional settings) to use this tool.",
                  }),
                )

              yield* permission.assert({
                action: name,
                resources: [settings.model],
                save: ["*"],
                metadata: { task: input.task.slice(0, 200) },
                sessionID: context.sessionID,
                agent: context.agent,
                source: { type: "tool", messageID: context.messageID, id: context.id },
              })

              const selected = (input.files ?? []).slice(0, MAX_FILES)
              const loaded = yield* Effect.forEach(
                selected,
                (file) =>
                  Effect.gen(function* () {
                    const absolute = AbsolutePath.make(path.join(location.directory, file))
                    const result = yield* files.read(absolute, file)
                    if (result.type !== "file")
                      return yield* Effect.fail(new ToolFailure({ message: `Path is not a readable file: ${file}` }))
                    const content =
                      result.content.length > MAX_FILE_CHARS
                        ? `${result.content.slice(0, MAX_FILE_CHARS)}\n[truncated: file excerpt only]`
                        : result.content
                    return { path: file, content }
                  }),
                { concurrency: 3 },
              )

              const user = buildUser(input, loaded)
              const response = yield* attempt(http, settings, user).pipe(
                Effect.mapError((error) => {
                  const message =
                    error instanceof QwenClient.QwenError ? describeFailure(error) : String(error)
                  return new ToolFailure({ message, error: error instanceof Error ? error : undefined })
                }),
              )

              const result = buildResult(settings, response)
              return { output: result, content: result.analysis, metadata: { model: settings.model, usage: result.usage } }
            }).pipe(
              Effect.mapError((error) =>
                error instanceof ToolFailure
                  ? error
                  : new ToolFailure({
                      message: error instanceof Error ? error.message : String(error),
                      error,
                    }),
              ),
            ),
        }),
      )
      .pipe(Effect.orDie)
  }),
}

const describeFailure = (error: QwenClient.QwenError) => {
  switch (error.reason) {
    case "unconfigured":
      return "Local Qwen endpoint is not configured. Set the `qwen` config section first."
    case "invalid-config":
      return "Local Qwen configuration is invalid. Check base_url and model."
    case "connection":
      return error.message
    case "timeout":
      return error.message
    case "rate-limit":
      return "Local Qwen endpoint rate-limited the request. Retry later or reduce request size."
    case "context-length":
      return "Request exceeded the local model's context limit. Reduce context or split the task; this request was not retried automatically."
    case "invalid-response":
    case "empty-output":
    case "http":
      return error.message
    default:
      return error.message
  }
}
