export * as ConfigRouting from "./routing.js"

import { Schema } from "effect"
import { optional } from "../schema.js"
import { ConfigModel } from "./model.js"

/**
 * Cost-aware runtime model routing. Applies to sessions without an explicit
 * user-selected model, and to sessions whose metadata enables routing explicitly
 * (the desktop composer's Auto choice). A pinned model is never overridden
 * otherwise, unless `escalate_pinned` is enabled. Does not change the global
 * default model.
 */
export class Roles extends Schema.Class<Roles>("Config.Routing.Roles")({
  /** Catalog model used for bounded, lower-cost tasks (local Qwen). */
  local: ConfigModel.Selection.pipe(optional),
  /** Catalog model used for routine-to-moderate tasks (DeepSeek Flash). */
  routine: ConfigModel.Selection.pipe(optional),
  /** Catalog model used for difficult or high-impact tasks (DeepSeek Pro). */
  pro: ConfigModel.Selection.pipe(optional),
}) {}

export class Info extends Schema.Class<Info>("Config.Routing")({
  enabled: Schema.Boolean,
  /** How aggressively to prefer cheaper models. */
  preference: Schema.Literals(["cost-first", "balanced", "quality-first"]),
  /** Allow escalation to a stronger model even when the user pinned one. */
  escalate_pinned: Schema.Boolean.pipe(optional),
  /** Explicit role-to-model assignments. Unset roles are discovered from the catalog. */
  roles: Roles.pipe(optional),
  /** Bounded retry budgets before escalation to a stronger tier. */
  attempts: Schema.Struct({
    /** Unsuccessful local attempts before escalation. Default 2. */
    local: Schema.Number.pipe(optional),
    /** Unsuccessful routine attempts before escalation. Default 2. */
    routine: Schema.Number.pipe(optional),
  }).pipe(optional),
  /** Whether the local Qwen tier participates in routing at all. */
  local_enabled: Schema.Boolean.pipe(optional),
  /** Emit concise synthetic route diagnostics into the session. */
  diagnostics: Schema.Boolean.pipe(optional),
}) {}
