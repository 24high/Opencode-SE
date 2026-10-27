export * as ConfigCompaction from "./compaction.js"

import { Schema } from "effect"
import { NonNegativeInt, optional } from "../schema.js"

export class Keep extends Schema.Class<Keep>("Config.Compaction.Keep")({
  tokens: NonNegativeInt.pipe(optional),
}) {}

export class Early extends Schema.Class<Early>("Config.Compaction.Early")({
  /** Enable early, cost-aware compaction below the context limit. Default false. */
  enabled: Schema.Boolean.pipe(optional),
  /** Estimated context tokens required before an early compaction is considered. */
  min_tokens: NonNegativeInt.pipe(optional),
  /** Minimum estimated tokens the compaction would remove for it to be worthwhile. */
  min_benefit_tokens: NonNegativeInt.pipe(optional),
  /** Seconds between consecutive early compactions of the same session. */
  cooldown_seconds: NonNegativeInt.pipe(optional),
  /** Only compact at task boundaries (a completed step or fresh user input). */
  require_task_boundary: Schema.Boolean.pipe(optional),
  /** Summarize through the configured local Qwen endpoint instead of the session model. */
  local_summarize: Schema.Boolean.pipe(optional),
}) {}

export class Info extends Schema.Class<Info>("Config.Compaction")({
  auto: Schema.Boolean.pipe(optional),
  keep: Keep.pipe(optional),
  buffer: NonNegativeInt.pipe(optional),
  /** Cost-aware early compaction; complements, never replaces, context-limit compaction. */
  early: Early.pipe(optional),
}) {}
