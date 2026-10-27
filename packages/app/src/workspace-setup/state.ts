export * as WorkspaceSetupState from "./state.js"

import { Schema } from "effect"
import { TEMPLATE_VERSION } from "./prompt.js"

export type Stage =
  | "idle"
  | "validating"
  | "preparing_prompt"
  | "generating_workspace"
  | "verifying_artifacts"
  | "opening_project"
  | "creating_session"
  | "starting_initial_task"
  | "completed"
  | "failed"
  | "cancelled"

const STAGES = [
  "idle",
  "validating",
  "preparing_prompt",
  "generating_workspace",
  "verifying_artifacts",
  "opening_project",
  "creating_session",
  "starting_initial_task",
  "completed",
  "failed",
  "cancelled",
] as const

export const TERMINAL: ReadonlySet<Stage> = new Set(["completed", "failed", "cancelled"])

export const OUTPUT_LANGUAGES = ["English", "German"] as const
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]

export type RoutingPreference = "cost-first" | "balanced" | "quality-first"

export interface QwenFormState {
  baseUrl: string
  model: string
  provider: string
  apiKeyEnv: string
  timeoutMs: number
  maxOutputTokens: number
  /** Whether a credential is stored for the local endpoint (never the key itself). */
  apiKeyStored: boolean
}

/** Persistence schema; secrets never enter this record. */
export const SetupStateSchema = Schema.Struct({
  stage: Schema.Literals(STAGES),
  directory: Schema.String,
  description: Schema.String,
  outputLanguage: Schema.Literals(OUTPUT_LANGUAGES),
  modelMode: Schema.Literals(["auto", "pin"]),
  pinnedModel: Schema.Struct({ providerID: Schema.String, modelID: Schema.String }).pipe(Schema.optional),
  preference: Schema.Literals(["cost-first", "balanced", "quality-first"]),
  qwenEnabled: Schema.Boolean,
  qwen: Schema.Struct({
    baseUrl: Schema.String,
    model: Schema.String,
    provider: Schema.String,
    apiKeyEnv: Schema.String,
    timeoutMs: Schema.Number,
    maxOutputTokens: Schema.Number,
    apiKeyStored: Schema.Boolean,
  }),
  earlyCompactionEnabled: Schema.Boolean,
  templateVersion: Schema.Number,
  generationSessionID: Schema.String.pipe(Schema.optional),
  initialSessionID: Schema.String.pipe(Schema.optional),
  resumeSessionID: Schema.String.pipe(Schema.optional),
  error: Schema.String.pipe(Schema.optional),
  log: Schema.Array(
    Schema.Struct({
      stage: Schema.Literals(STAGES),
      at: Schema.Number,
      detail: Schema.String.pipe(Schema.optional),
    }),
  ),
})

export interface SetupState extends Schema.Schema.Type<typeof SetupStateSchema> {}

export const initial = (): SetupState => ({
  stage: "idle",
  directory: "",
  description: "",
  outputLanguage: "English",
  modelMode: "auto",
  preference: "balanced",
  qwenEnabled: false,
  qwen: {
    baseUrl: "",
    model: "",
    provider: "",
    apiKeyEnv: "",
    timeoutMs: 120_000,
    maxOutputTokens: 2048,
    apiKeyStored: false,
  },
  earlyCompactionEnabled: true,
  templateVersion: TEMPLATE_VERSION,
  log: [],
})

export type Event =
  | { type: "begin"; input: FormInput }
  | { type: "stage"; stage: Stage; detail?: string }
  | { type: "generation-session"; sessionID: string }
  | { type: "initial-session"; sessionID: string }
  | { type: "resume-session"; sessionID: string }
  | { type: "completed" }
  | { type: "failed"; error: string }
  | { type: "cancelled"; detail?: string }
  | { type: "reset" }

export interface FormInput {
  directory: string
  description: string
  outputLanguage: OutputLanguage
  modelMode: "auto" | "pin"
  pinnedModel?: { providerID: string; modelID: string }
  preference: RoutingPreference
  qwenEnabled: boolean
  qwen: QwenFormState
  earlyCompactionEnabled: boolean
  /** When set, generation resumes in the existing session instead of creating one. */
  resumeSessionID?: string
}

const RESUME_STAGES: ReadonlyArray<Stage> = [
  "validating",
  "preparing_prompt",
  "generating_workspace",
  "verifying_artifacts",
  "opening_project",
  "creating_session",
  "starting_initial_task",
]

const VALID_TRANSITIONS: Readonly<Record<Stage, ReadonlyArray<Stage>>> = {
  idle: ["validating"],
  validating: ["preparing_prompt", "failed", "cancelled"],
  preparing_prompt: ["generating_workspace", "failed", "cancelled"],
  generating_workspace: ["verifying_artifacts", "failed", "cancelled"],
  verifying_artifacts: ["opening_project", "failed", "cancelled"],
  opening_project: ["creating_session", "failed", "cancelled"],
  creating_session: ["starting_initial_task", "failed", "cancelled"],
  starting_initial_task: ["completed", "failed", "cancelled"],
  completed: [],
  failed: RESUME_STAGES,
  cancelled: RESUME_STAGES,
}

/**
 * Explicit recoverable state machine for workspace setup. Transitions follow
 * real event results; illegal transitions are ignored so a stale or repeated
 * event can never corrupt the recorded stage.
 */
export const transition = (previous: SetupState, event: Event): SetupState => {
  if (event.type === "reset") return initial()
  if (event.type === "begin") {
    return {
      ...previous,
      stage: "validating",
      directory: event.input.directory,
      description: event.input.description,
      outputLanguage: event.input.outputLanguage,
      modelMode: event.input.modelMode,
      ...(event.input.pinnedModel ? { pinnedModel: event.input.pinnedModel } : {}),
      preference: event.input.preference,
      qwenEnabled: event.input.qwenEnabled,
      qwen: event.input.qwen,
      earlyCompactionEnabled: event.input.earlyCompactionEnabled,
      log: [...previous.log, { stage: "validating" as const, at: Date.now() }],
    }
  }
  if (event.type === "completed") {
    if (previous.stage !== "starting_initial_task") return previous
    return { ...previous, stage: "completed", log: [...previous.log, { stage: "completed" as const, at: Date.now() }] }
  }
  if (event.type === "failed") {
    if (TERMINAL.has(previous.stage)) return previous
    return {
      ...previous,
      stage: "failed",
      error: event.error,
      log: [...previous.log, { stage: "failed" as const, at: Date.now(), detail: event.error }],
    }
  }
  if (event.type === "cancelled") {
    if (TERMINAL.has(previous.stage)) return previous
    return {
      ...previous,
      stage: "cancelled",
      log: [...previous.log, { stage: "cancelled" as const, at: Date.now(), detail: event.detail }],
    }
  }
  if (event.type === "stage") {
    if (!VALID_TRANSITIONS[previous.stage].includes(event.stage)) return previous
    return {
      ...previous,
      stage: event.stage,
      log: [...previous.log, { stage: event.stage, at: Date.now(), ...(event.detail ? { detail: event.detail } : {}) }],
    }
  }
  if (event.type === "generation-session") return { ...previous, generationSessionID: event.sessionID }
  if (event.type === "initial-session") return { ...previous, initialSessionID: event.sessionID }
  if (event.type === "resume-session") return { ...previous, resumeSessionID: event.sessionID }
  return previous
}

export type ResumeStage = Exclude<Stage, "idle" | "preparing_prompt" | "completed" | "failed" | "cancelled">

/** Last stage that completed or started; the safe retry point after a failure. */
export const resumePoint = (state: SetupState): ResumeStage => {
  if (state.stage === "failed" || state.stage === "cancelled") {
      // The terminal failure entry is the newest log row; resume from the last
      // real stage before it.
      const last = [...state.log]
        .reverse()
        .find((entry) => entry.stage !== "failed" && entry.stage !== "cancelled")?.stage
    if (last === "verifying_artifacts") return "verifying_artifacts"
    if (last === "opening_project") return "opening_project"
    if (last === "creating_session") return "creating_session"
    if (last === "starting_initial_task") return "starting_initial_task"
    if (state.generationSessionID) return "generating_workspace"
    return "validating"
  }
  if (state.stage === "preparing_prompt" || state.stage === "idle") return "validating"
  if (state.stage === "completed") return "verifying_artifacts"
  return state.stage
}

/** Whether a second concurrent setup for the same directory must be prevented. */
export const isActive = (state: SetupState) => !TERMINAL.has(state.stage) && state.stage !== "idle"
