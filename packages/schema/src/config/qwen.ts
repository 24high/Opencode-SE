export * as ConfigQwen from "./qwen.js"

import { Schema } from "effect"
import { optional, PositiveInt } from "../schema.js"

/**
 * Endpoint settings for a local Qwen model served through an OpenAI-compatible
 * API. The `qwen` tool and the routing policy read these values; they never
 * grant filesystem or shell access on their own.
 */
export class Info extends Schema.Class<Info>("Config.Qwen")({
  /** Base URL of the OpenAI-compatible endpoint, e.g. `http://127.0.0.1:1234/v1`. */
  base_url: Schema.String,
  /** Model ID accepted by the endpoint's Chat Completions API. */
  model: Schema.String,
  /**
   * Provider ID of the catalog entry that exposes this endpoint as a native
   * model (the matching key under `providers`). Used by the routing policy.
   */
  provider: Schema.String.pipe(optional),
  /**
   * Name of an environment variable holding an optional API key. Prefer this
   * over inline secrets; local endpoints are usually unauthenticated.
   */
  api_key_env: Schema.String.pipe(optional),
  /** Request timeout in milliseconds. Bounded by the client. */
  timeout_ms: PositiveInt.pipe(optional),
  /** Maximum completion tokens per request. */
  max_output_tokens: PositiveInt.pipe(optional),
  /** Sampling temperature where the endpoint supports it. */
  temperature: Schema.Number.pipe(optional),
}) {}
