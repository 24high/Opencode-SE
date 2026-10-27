export * as WorkspaceSetupController from "./controller.js"

import { Session } from "@opencode/schema/session"
import { createEffect } from "solid-js"
import { reconcile } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { persisted, Persist } from "@/runtime/persistence/storage"
import { addProjects } from "@/home/projects/add"
import type { ServerCtx } from "@/runtime/server/runtime"
import { ServerConnection } from "@/runtime/server/registry"
import type { useTabs } from "@/shell/tabs/tabs"
import { WorkspaceSetupConfig, buildSessionMetadata } from "./config"
import { assembleGenerationPrompt, extractInitialTask, template, TEMPLATE_VERSION } from "./prompt"
import { WorkspaceSetupState as State, SetupStateSchema, transition, isActive, resumePoint, type FormInput } from "./state"

const GENERATION_TIMEOUT_MS = 30 * 60 * 1000
const POLL_INTERVAL_MS = 1500
export const REQUIRED_ARTIFACTS = ["AGENTS.md", "WORKSPACE_SETUP.md"] as const

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Server-scoped capabilities captured by the opener. Dialogs render inside the
 * dialog portal, above the Server/Tabs providers, so the wizard receives these
 * as props instead of reading them from context.
 */
export interface Environment {
  readonly server: ServerConnection.Any
  readonly context: ServerCtx
  readonly tabs: ReturnType<typeof useTabs>
}

export const buildMetadata = (input: FormInput) => buildSessionMetadata(input)

type FromStage = Exclude<State.Stage, "idle" | "completed" | "failed" | "cancelled" | "preparing_prompt">

export function createWorkspaceSetupController(env: Environment) {
  const data = env.context.data
  const sdk = env.context.sdk
  const serverKey = ServerConnection.key(env.server)
  const tabs = env.tabs
  const language = useLanguage()

  const [state, setState, , ready] = persisted(Persist.global("workspace-setup"), SetupStateSchema, State.initial())

  const dispatch = (event: State.Event) => setState(reconcile(transition(state, event)))

  // A completed run has nothing left to resume, so the wizard must not replay its
  // completion view when it is opened again. Drop it as soon as the persisted run
  // is known: synchronous storage is hydrated at creation, asynchronous desktop
  // storage follows shortly, so the same check also runs once as an effect.
  let checkedPreviousRun = false
  const discardCompletedRun = () => {
    if (checkedPreviousRun || !ready()) return
    checkedPreviousRun = true
    if (state.stage === "completed") dispatch({ type: "reset" })
  }
  discardCompletedRun()
  createEffect(discardCompletedRun)

  const waitForOutcome = async (sessionID: string): Promise<string> => {
    const deadline = Date.now() + GENERATION_TIMEOUT_MS
    while (Date.now() < deadline) {
      const info = await sdk.api.session.get({ sessionID })
      if (info.outcome !== undefined) return info.outcome
      await sleep(POLL_INTERVAL_MS)
    }
    return "interrupted"
  }

  const verifyArtifacts = async (directory: string): Promise<string[]> => {
    const missing: string[] = []
    const listed = await sdk.api.file.list({ path: ".", location: { directory } })
    const names = new Set(listed.data.map((entry) => entry.path))
    for (const artifact of REQUIRED_ARTIFACTS) {
      if (!names.has(artifact)) {
        missing.push(artifact)
        continue
      }
      const content = new TextDecoder().decode(await sdk.api.file.read({ path: artifact, location: { directory } }))
      if (content.trim().length === 0) missing.push(`${artifact} (empty)`)
    }
    return missing
  }

  const openProjectAndStart = async (input: FormInput, directory: string) => {
    dispatch({ type: "stage", stage: "opening_project" })
    addProjects(env.context, [directory])

    const initialID = state.initialSessionID
    if (initialID) {
      // The session already exists from a partial run: reuse it instead of duplicating.
      dispatch({ type: "stage", stage: "starting_initial_task" })
      await data.session.prompt({ sessionID: initialID, text: extractInitialTask(template(), input.description) })
      const tab = tabs.addSessionTab({ server: serverKey, sessionId: initialID })
      tabs.select(tab)
      dispatch({ type: "completed" })
      return
    }

    dispatch({ type: "stage", stage: "creating_session" })
    const created = data.session.create({
      id: Session.ID.create(),
      ...(input.modelMode === "pin" && input.pinnedModel
        ? { model: { id: input.pinnedModel.modelID, providerID: input.pinnedModel.providerID } }
        : {}),
      location: { directory },
      metadata: buildMetadata(input),
    })
    await created.request
    dispatch({ type: "initial-session", sessionID: created.id })
    dispatch({ type: "stage", stage: "starting_initial_task" })
    await data.session.prompt({ sessionID: created.id, text: extractInitialTask(template(), input.description) })

    const tab = tabs.addSessionTab({ server: serverKey, sessionId: created.id })
    tabs.select(tab)
    dispatch({ type: "completed" })
    showToast({ title: language.t("workspaceSetup.toast.completed"), description: directory })
  }

  const runStages = async (input: FormInput, from: FromStage): Promise<void> => {
    const directory = input.directory

    if (from === "validating" || from === "generating_workspace") {
      if (from === "validating") {
        // validating: the directory must be readable and resolvable.
        try {
          await sdk.api.location.get({ location: { directory } })
        } catch (error) {
          throw new Error(`The project directory is not accessible: ${message(error)}`)
        }
        dispatch({ type: "stage", stage: "preparing_prompt" })
      }

      // preparing_prompt: deterministic assembly from the canonical template.
      let promptText: string
      try {
        promptText = assembleGenerationPrompt({
          template: template(),
          description: input.description,
          outputLanguage: input.outputLanguage,
          configBlock: WorkspaceSetupConfig.buildConfigBlock({
            description: input.description,
            directory,
            outputLanguage: input.outputLanguage,
            modelMode: input.modelMode,
            ...(input.pinnedModel ? { pinnedModel: input.pinnedModel } : {}),
            preference: input.preference,
            qwenEnabled: input.qwenEnabled,
            qwen: input.qwen,
            earlyCompactionEnabled: input.earlyCompactionEnabled,
          }),
        })
      } catch (error) {
        throw new Error(`The workspace template could not be loaded: ${message(error)}`)
      }

      dispatch({ type: "stage", stage: "generating_workspace" })
      const generationID = input.resumeSessionID ?? Session.ID.create()
      const generation = data.session.create({
        id: generationID,
        ...(input.modelMode === "pin" && input.pinnedModel
          ? { model: { id: input.pinnedModel.modelID, providerID: input.pinnedModel.providerID } }
          : {}),
        location: { directory },
        metadata: buildMetadata(input),
      })
      await generation.request
      dispatch({ type: "generation-session", sessionID: generationID })

      const promptForSession = input.resumeSessionID
        ? "The previous generation did not complete. Continue from the instructions you were given: inspect the current state of the workspace, create the remaining required artifacts, and update the manifest. Do not repeat artifacts that are already complete and correct."
        : promptText
      await data.session.prompt({ sessionID: generationID, text: promptForSession })
      const outcome = await waitForOutcome(generationID)
      if (outcome !== "succeeded")
        throw new Error(`Workspace generation did not succeed (${outcome}). Retry from the last confirmed stage.`)
    }

    // verifying_artifacts
    dispatch({ type: "stage", stage: "verifying_artifacts" })
    const missing = await verifyArtifacts(directory)
    if (missing.length > 0) {
      const generationID = state.generationSessionID
      if (generationID) dispatch({ type: "resume-session", sessionID: generationID })
      throw new Error(`Verification failed: missing ${missing.join(", ")}`)
    }

    await openProjectAndStart(input, directory)
  }

  const begin = async (input: FormInput) => {
    if (!ready()) return
    if (isActive(state)) return
    dispatch({ type: "begin", input })
    try {
      await runStages(input, "validating")
    } catch (error) {
      dispatch({ type: "failed", error: message(error) })
    }
  }

  /** Resumes from the last confirmed stage; idempotent after restarts. */
  const retry = async () => {
    const point = resumePoint(state)
    const input: FormInput = {
      directory: state.directory,
      description: state.description,
      outputLanguage: state.outputLanguage,
      modelMode: state.modelMode,
      ...(state.pinnedModel ? { pinnedModel: state.pinnedModel } : {}),
      preference: state.preference,
      qwenEnabled: state.qwenEnabled,
      qwen: state.qwen,
      earlyCompactionEnabled: state.earlyCompactionEnabled,
      ...(state.resumeSessionID ? { resumeSessionID: state.resumeSessionID } : {}),
    }
    const from: FromStage =
      point === "generating_workspace" ? "generating_workspace" : point === "validating" ? "validating" : point
    try {
      await runStages(input, from)
    } catch (error) {
      dispatch({ type: "failed", error: message(error) })
    }
  }

  const cancel = async () => {
    if (state.generationSessionID) {
      try {
        await sdk.api.session.interrupt({ sessionID: state.generationSessionID })
      } catch {
        // The session may already be idle; interruption is best-effort.
      }
    }
    dispatch({ type: "cancelled", detail: "User cancelled workspace setup" })
  }

  const reset = () => dispatch({ type: "reset" })

  const testConnection = (input: { baseUrl: string; model: string; apiKey?: string }) =>
    sdk.api["server.qwen"].test({
      base_url: input.baseUrl,
      model: input.model,
      timeout_ms: 15_000,
      ...(input.apiKey ? { api_key: input.apiKey } : {}),
    })

  const saveApiKey = (key: string) =>
    sdk.api.credential.create({
      integrationID: "qwen-local",
      value: { type: "key", key },
      label: "Local Qwen endpoint",
    })

  return { state, ready, begin, retry, cancel, reset, testConnection, saveApiKey, templateVersion: TEMPLATE_VERSION }
}

const message = (error: unknown) => {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string")
    return error.message
  return String(error)
}
