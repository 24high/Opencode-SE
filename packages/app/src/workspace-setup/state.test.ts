import { expect, test } from "bun:test"
import { WorkspaceSetupState as State, transition, isActive, resumePoint, initial } from "./state"

const form = (): State.FormInput => ({
  directory: "/projects/demo",
  description: "A demo project",
  outputLanguage: "English",
  modelMode: "auto",
  preference: "balanced",
  qwenEnabled: false,
  qwen: {
    baseUrl: "",
    model: "",
    provider: "",
    apiKeyEnv: "",
    timeoutMs: 120000,
    maxOutputTokens: 2048,
    apiKeyStored: false,
  },
  earlyCompactionEnabled: true,
})

test("the state machine follows real events in order", () => {
  let state = initial()
  expect(state.stage).toBe("idle")
  state = transition(state, { type: "begin", input: form() })
  expect(state.stage).toBe("validating")
  state = transition(state, { type: "stage", stage: "preparing_prompt" })
  state = transition(state, { type: "stage", stage: "generating_workspace" })
  state = transition(state, { type: "generation-session", sessionID: "ses_gen_1" })
  expect(state.generationSessionID).toBe("ses_gen_1")
  state = transition(state, { type: "stage", stage: "verifying_artifacts" })
  state = transition(state, { type: "stage", stage: "opening_project" })
  state = transition(state, { type: "stage", stage: "creating_session" })
  state = transition(state, { type: "initial-session", sessionID: "ses_init_1" })
  state = transition(state, { type: "stage", stage: "starting_initial_task" })
  state = transition(state, { type: "completed" })
  expect(state.stage).toBe("completed")
  expect(state.initialSessionID).toBe("ses_init_1")
  expect(state.log.map((entry) => entry.stage)).toEqual([
    "validating",
    "preparing_prompt",
    "generating_workspace",
    "verifying_artifacts",
    "opening_project",
    "creating_session",
    "starting_initial_task",
    "completed",
  ])
})

test("illegal transitions are ignored and cannot corrupt the stage", () => {
  const begun = transition(initial(), { type: "begin", input: form() })
  const jumped = transition(begun, { type: "stage", stage: "creating_session" })
  expect(jumped.stage).toBe("validating")
  // Terminal states ignore further failures and completions.
  const failed = transition(jumped, { type: "failed", error: "boom" })
  expect(transition(failed, { type: "failed", error: "again" }).error).toBe("boom")
  expect(transition(failed, { type: "completed" }).stage).toBe("failed")
})

test("failures keep the log for a safe resume point", () => {
  let state = transition(initial(), { type: "begin", input: form() })
  state = transition(state, { type: "stage", stage: "preparing_prompt" })
  state = transition(state, { type: "stage", stage: "generating_workspace" })
  state = transition(state, { type: "generation-session", sessionID: "ses_gen_1" })
  state = transition(state, { type: "failed", error: "generation failed" })
  expect(state.stage).toBe("failed")
  expect(resumePoint(state)).toBe("generating_workspace")
  expect(isActive(state)).toBe(false)
})

test("resume-session records the partial generation session for a targeted retry", () => {
  let state = transition(initial(), { type: "begin", input: form() })
  state = transition(state, { type: "stage", stage: "preparing_prompt" })
  state = transition(state, { type: "stage", stage: "generating_workspace" })
  state = transition(state, { type: "generation-session", sessionID: "ses_gen_1" })
  state = transition(state, { type: "stage", stage: "verifying_artifacts" })
  state = transition(state, { type: "resume-session", sessionID: "ses_gen_1" })
  state = transition(state, { type: "failed", error: "missing AGENTS.md" })
  expect(state.resumeSessionID).toBe("ses_gen_1")
  expect(resumePoint(state)).toBe("verifying_artifacts")
})

test("reset returns to the pristine initial state", () => {
  let state = transition(initial(), { type: "begin", input: form() })
  state = transition(state, { type: "cancelled", detail: "stop" })
  expect(state.stage).toBe("cancelled")
  expect(isActive(state)).toBe(false)
  expect(transition(state, { type: "reset" })).toEqual(initial())
})

test("a retry transitions from the resumed stage", () => {
  let state = transition(initial(), { type: "begin", input: form() })
  state = transition(state, { type: "stage", stage: "preparing_prompt" })
  state = transition(state, { type: "failed", error: "no model" })
  state = transition(state, { type: "stage", stage: "verifying_artifacts" })
  expect(state.stage).toBe("verifying_artifacts")
})
