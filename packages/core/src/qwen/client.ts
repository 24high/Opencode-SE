export * as QwenClient from "./client.js"

import { Credential } from "../credential.js"
import { Config } from "../config.js"
import { Integration } from "@opencode/schema/integration"
import { Effect, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"

export const INTEGRATION_ID = "qwen-local"

export const DEFAULT_TIMEOUT_MS = 120_000
export const MAX_TIMEOUT_MS = 300_000
export const DEFAULT_MAX_OUTPUT_TOKENS = 2_048
export const MAX_OUTPUT_TOKENS = 16_384

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
export const Settings = Schema.Struct({
  base_url: Schema.String,
  model: Schema.String,
  /** Catalog provider ID of the native model entry for this endpoint. */
  provider: Schema.optional(Schema.String),
  apiKey: Schema.optional(Schema.String),
  timeoutMs: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_TIMEOUT_MS))),
  maxOutputTokens: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_MAX_OUTPUT_TOKENS))),
  temperature: Schema.optional(Schema.Number),
})

export interface Request {
  readonly system: string
  readonly user: string
  readonly maxOutputTokens?: number
}

export interface Response {
  readonly content: string
  /** Parsed from provider usage metadata; fields stay undefined when the server omits them. */
  readonly usage: { readonly input?: number; readonly output?: number }
}

export class QwenError extends Schema.TaggedError<QwenError>()("QwenClient.Error", {
  reason: Schema.Literals([
    "unconfigured",
    "invalid-config",
    "connection",
    "timeout",
    "http",
    "rate-limit",
    "context-length",
    "invalid-response",
    "empty-output",
  ]),
  status: Schema.optional(Schema.Number),
  message: Schema.String,
}) {}

/**
 * Loads Qwen endpoint settings from configuration, resolving the optional API
 * key from the configured environment variable or the stored credential. Never
 * returns the key in error messages or results.
 */
export const loadSettings = (
  config: Config.Interface,
  credentials: Credential.Interface,
): Effect.Effect<Settings | undefined, never, never> =>
  Effect.gen(function* () {
    const entries = yield* config.entries()
    const configured = Config.latest(entries, "qwen")
    if (!configured) return
    let apiKey: string | undefined
    if (configured.api_key_env) {
      const fromEnv = process.env[configured.api_key_env]
      if (fromEnv) apiKey = fromEnv
    }
    if (apiKey === undefined) {
      const stored = yield* credentials.list(Integration.ID.make(INTEGRATION_ID))
      const key = stored.findLast((credential) => credential.value.type === "key")?.value
      if (key?.type === "key") apiKey = key.key
    }
    return {
      base_url: configured.base_url,
      model: configured.model,
      ...(configured.provider === undefined ? {} : { provider: configured.provider }),
      ...(apiKey === undefined ? {} : { apiKey }),
      timeoutMs: configured.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      maxOutputTokens: configured.max_output_tokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      ...(configured.temperature === undefined ? {} : { temperature: configured.temperature }),
    }
  })

/** Sends one bounded Chat Completions request and parses the response defensively. */
export const chat = Effect.fn("QwenClient.chat")(function* (input: {
  readonly http: HttpClient.HttpClient
  readonly config: Settings
  readonly request: Request
}): Effect.fn.Return<Response, QwenError> {
  const { config, request } = input
  const timeoutMs = Math.min(Math.max(config.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1), MAX_TIMEOUT_MS)
  const maxOutputTokens = Math.min(
    Math.max(request.maxOutputTokens ?? config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS, 1),
    MAX_OUTPUT_TOKENS,
  )

  const body = {
    model: config.model,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    stream: false,
    max_tokens: maxOutputTokens,
    ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
  }

  const base = HttpClientRequest.post(chatURL(config.base_url)).pipe(
    HttpClientRequest.setHeader("Content-Type", "application/json"),
  )
  const authed =
    config.apiKey === undefined
      ? base
      : base.pipe(HttpClientRequest.setHeader("Authorization", `Bearer ${config.apiKey}`))

  const outcome = yield* Effect.gen(function* () {
    const built = yield* authed.pipe(HttpClientRequest.schemaBodyJson(Schema.Unknown)(body))
    const response = yield* input.http.execute(built)
    const status = response.status
    const raw = yield* response.text
    if (status !== 200) {
      const parsed = parseJSON(raw)
      const detail = readErrorDetail(parsed)
      const message = detail !== undefined ? detail.slice(0,500) : `HTTP ${status}`
      if (status === 429) return yield* new QwenError({ reason: "rate-limit", status, message })
      if (status === 401 || status === 403) return yield* new QwenError({ reason: "http", status, message })
      if (status >= 500) return yield* new QwenError({ reason: "http", status, message })
      if (/context|too long|maximum.*length|window|tokens?/i.test(message))
        return yield* new QwenError({ reason: "context-length", status, message })
      return yield* new QwenError({ reason: "http", status, message })
    }
    const parsed = parseJSON(raw)
    if (typeof parsed !== "object" || parsed === null || !("choices" in parsed))
      return yield* new QwenError({ reason: "invalid-response", message: "Response body is not a Chat Completions object" })
    const choices = parsed.choices
    if (!Array.isArray(choices) || choices.length === 0)
      return yield* new QwenError({ reason: "invalid-response", message: "Response has no choices" })
    const first = choices[0]
    const message = typeof first === "object" && first !== null && "message" in first ? (first as { message?: unknown }).message : undefined
    const content =
      typeof message === "object" && message !== null && "content" in message
        ? extractContent((message as { content?: unknown }).content)
        : ""
    if (content.length === 0)
      return yield* new QwenError({ reason: "empty-output", message: "Response contained no assistant content" })
    const usage = extractUsage(
      typeof parsed === "object" && parsed !== null && "usage" in parsed ? (parsed as { usage?: unknown }).usage : undefined,
    )
    return { content, usage }
  }).pipe(
    Effect.mapError(toQwenError),
    Effect.timeoutOption(timeoutMs),
  )

  if (outcome._tag === "None")
    return yield* new QwenError({ reason: "timeout", message: `Request timed out after ${timeoutMs}ms` })
  return outcome.value
})

const toQwenError = (error: unknown): QwenError => {
  if (error instanceof QwenError) return error
  const reasonTag = (error as { reason?: { _tag?: string } } | undefined)?.reason?._tag
  if (reasonTag === "TransportError")
    return new QwenError({
      reason: "connection",
      message: "Could not reach the configured local endpoint. Verify the base URL and that the server is running.",
    })
  const message =
    typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : ""
  if (message.length > 0 && /fetch|ECONN|ENOTFOUND|socket|transport/i.test(message))
    return new QwenError({
      reason: "connection",
      message: `Could not reach the configured local endpoint (${message}). Verify the base URL and that the server is running.`,
    })
  return new QwenError({ reason: "http", message: message || "Unknown request failure" })
}

/** Accepts a base URL with or without a trailing slash and appends the Chat Completions path. */
export const chatURL = (baseURL: string) => {
  const base = baseURL.replace(/\/+$/, "")
  if (/\/chat\/completions$/.test(base)) return base
  return `${base}/chat/completions`
}

const parseJSON = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const readErrorDetail = (parsed: unknown): string | undefined => {
  if (typeof parsed !== "object" || parsed === null || !("error" in parsed)) return undefined
  const error = (parsed as { error?: unknown }).error
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string")
    return error.message
  return undefined
}

/** Chat Completions content may be a string or an array of parts. */
const extractContent = (content: unknown): string => {
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""
  return content
    .flatMap((part) => {
      if (typeof part === "string") return [part]
      if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") return [part.text]
      return []
    })
    .join("")
    .trim()
}

/** Usage metadata is optional for compatible servers; absent fields stay absent. */
const extractUsage = (usage: unknown): Response["usage"] => {
  if (typeof usage !== "object" || usage === null) return {}
  const input = readNumber((usage as Record<string, unknown>).prompt_tokens)
  const output = readNumber((usage as Record<string, unknown>).completion_tokens)
  return { ...(input === undefined ? {} : { input }), ...(output === undefined ? {} : { output }) }
}

const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined
