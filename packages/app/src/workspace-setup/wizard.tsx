import { createEffect, createResource, createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Divider } from "@opencode/ui/divider"
import { Textarea } from "@opencode/ui/textarea"
import { TextInput } from "@opencode/ui/text-input"
import { Select } from "@opencode/ui/select"
import { Switch } from "@opencode/ui/switch"
import { Field } from "@opencode/ui/field"
import { useDialog } from "@opencode/ui/context/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import { OUTPUT_LANGUAGES, validateSetup, type ValidationErrors } from "./config"
import { createWorkspaceSetupController, type Environment } from "./controller"
import { TERMINAL, type Stage } from "./state"
import "./workspace-setup.css"

interface ModelOption {
  providerID: string
  modelID: string
  name: string
}

export function WorkspaceSetupWizard(props: { env: Environment }) {
  const dialog = useDialog()
  const language = useLanguage()
  const env = props.env
  const sdk = env.context.sdk
  const pickDirectory = useDirectoryPicker()
  const controller = createWorkspaceSetupController(env)

  const [form, setForm] = createStore({
    description: "",
    directory: "",
    outputLanguage: OUTPUT_LANGUAGES[0] as (typeof OUTPUT_LANGUAGES)[number],
    modelMode: "auto" as "auto" | "pin",
    pinnedModel: undefined as ModelOption | undefined,
    preference: "balanced" as "cost-first" | "balanced" | "quality-first",
    qwenEnabled: false,
    qwenBaseUrl: "http://127.0.0.1:1234/v1",
    qwenModel: "",
    qwenProvider: "",
    apiKey: "",
    qwenTimeoutMs: 120000,
    qwenMaxOutputTokens: 2048,
    earlyCompactionEnabled: true,
  })
  const [errors, setErrors] = createStore<ValidationErrors>({})
  const [testState, setTestState] = createSignal<{ busy: boolean; result?: { ok: boolean; message: string } }>({
    busy: false,
  })

  const [models] = createResource(
    () => (form.modelMode === "pin" && form.directory ? form.directory : false),
    async (directory) => {
      if (!directory) return []
      const result = await sdk.api.model.list({ location: { directory } })
      return result.data
        .filter((model) => !("enabled" in model) || model.enabled)
        .map((model) => ({ providerID: model.providerID, modelID: model.id, name: model.name }))
    },
  )

  createEffect(() => {
    if (!controller.ready()) return
    const current = controller.state
    if (current.stage !== "idle" || !current.directory) return
    setForm("directory", current.directory)
  })

  createEffect(() => {
    const fallback = env.context.data.location.default()
    if (fallback.directory && form.directory === "") setForm("directory", fallback.directory)
  })

  const stage = () => controller.state.stage

  const submit = async () => {
    const validation = validateSetup({
      description: form.description,
      directory: form.directory,
      outputLanguage: form.outputLanguage,
      qwenEnabled: form.qwenEnabled,
      qwen: { baseUrl: form.qwenBaseUrl, model: form.qwenModel, provider: form.qwenProvider },
    })
    setErrors(validation)
    if (Object.keys(validation).length > 0) return
    if (form.modelMode === "pin" && !form.pinnedModel) {
      setErrors({ model: language.t("workspaceSetup.model.missing") })
      return
    }
    if (form.apiKey.trim().length > 0) {
      try {
        await controller.saveApiKey(form.apiKey.trim())
      } catch {
        setErrors({ apiKey: language.t("workspaceSetup.qwen.apiKey.failed") })
        return
      }
    }
    await controller.begin({
      directory: form.directory,
      description: form.description,
      outputLanguage: form.outputLanguage,
      modelMode: form.modelMode,
      ...(form.pinnedModel
        ? { pinnedModel: { providerID: form.pinnedModel.providerID, modelID: form.pinnedModel.modelID } }
        : {}),
      preference: form.preference,
      qwenEnabled: form.qwenEnabled,
      qwen: {
        baseUrl: form.qwenBaseUrl,
        model: form.qwenModel,
        provider: form.qwenProvider,
        apiKeyEnv: "",
        timeoutMs: form.qwenTimeoutMs,
        maxOutputTokens: form.qwenMaxOutputTokens,
        apiKeyStored: false,
      },
      earlyCompactionEnabled: form.earlyCompactionEnabled,
    })
  }

  const testConnection = async () => {
    setTestState({ busy: true })
    try {
      const result = await controller.testConnection({
        baseUrl: form.qwenBaseUrl,
        model: form.qwenModel,
        ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
      })
      setTestState({
        busy: false,
        result: result.ok
          ? { ok: true, message: `${result.model} · ${result.latency_ms ?? "?"} ms` }
          : { ok: false, message: result.error ?? language.t("workspaceSetup.qwen.test.failedShort") },
      })
    } catch (error) {
      setTestState({
        busy: false,
        result: { ok: false, message: error instanceof Error ? error.message : language.t("workspaceSetup.qwen.test.failedShort") },
      })
    }
  }

  return (
    <Dialog size="large" class="workspace-setup-dialog">
      <DialogHeader>
        <DialogTitle>{language.t("workspaceSetup.title")}</DialogTitle>
      </DialogHeader>
      <Divider />
      <DialogBody class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        <Show when={stage() !== "idle"}>
          <ProgressView
            stage={stage()}
            error={controller.state.error}
            onCancel={() => void controller.cancel()}
            onRetry={() => void controller.retry()}
            onReset={() => {
              controller.reset()
              dialog.close()
            }}
            onClose={() => dialog.close()}
          />
        </Show>
        <Show when={stage() === "idle"}>
          <div class="flex flex-col gap-2">
            <Field class="w-full">
              <Field.Label class="workspace-setup-dialog-label">{language.t("workspaceSetup.description.label")}</Field.Label>
              <Textarea
                value={form.description}
                placeholder={language.t("workspaceSetup.description.placeholder")}
                onInput={(event) => setForm("description", event.currentTarget.value)}
                invalid={!!errors.description}
              />
              <Show when={errors.description}>
                <p class="workspace-setup-dialog-error">{errors.description}</p>
              </Show>
            </Field>

            <Field class="w-full">
              <Field.Label class="workspace-setup-dialog-label">{language.t("workspaceSetup.directory.label")}</Field.Label>
              <div class="flex w-full gap-2">
                <TextInput
                  value={form.directory}
                  placeholder={language.t("workspaceSetup.directory.placeholder")}
                  onInput={(event) => setForm("directory", event.currentTarget.value)}
                  invalid={!!errors.directory}
                />
                <Button
                  variant="neutral"
                  onClick={() =>
                    pickDirectory({
                      server: env.server,
                      title: language.t("workspaceSetup.directory.choose"),
                      multiple: false,
                      onSelect: (directory) => {
                        if (typeof directory === "string") setForm("directory", directory)
                      },
                    })
                  }
                >
                  {language.t("workspaceSetup.directory.browse")}
                </Button>
              </div>
              <Show when={errors.directory}>
                <p class="workspace-setup-dialog-error">{errors.directory}</p>
              </Show>
            </Field>

            <Field class="w-full">
              <Field.Label class="workspace-setup-dialog-label">{language.t("workspaceSetup.language.label")}</Field.Label>
              <Select
                options={[...OUTPUT_LANGUAGES]}
                current={form.outputLanguage}
                value={(option) => option}
                label={(option) => option}
                onSelect={(option) => option && setForm("outputLanguage", option)}
              />
              <p class="workspace-setup-dialog-hint">{language.t("workspaceSetup.language.description")}</p>
            </Field>

            <Field class="w-full">
              <Field.Label class="workspace-setup-dialog-label">{language.t("workspaceSetup.model.label")}</Field.Label>
              <div class="flex flex-col gap-2">
                <label class="workspace-setup-dialog-hint flex items-center gap-2">
                  <input
                    type="radio"
                    name="workspace-setup-model"
                    checked={form.modelMode === "auto"}
                    onChange={() => setForm("modelMode", "auto")}
                  />
                  {language.t("workspaceSetup.model.auto")}
                </label>
                <label class="workspace-setup-dialog-hint flex items-center gap-2">
                  <input
                    type="radio"
                    name="workspace-setup-model"
                    checked={form.modelMode === "pin"}
                    onChange={() => setForm("modelMode", "pin")}
                  />
                  {language.t("workspaceSetup.model.pin")}
                </label>
                <Show when={form.modelMode === "pin"}>
                  <Select<ModelOption>
                    options={models() ?? []}
                    current={form.pinnedModel}
                    value={(option) => `${option.providerID}/${option.modelID}`}
                    label={(option) => `${option.name} (${option.providerID}/${option.modelID})`}
                    placeholder={language.t("workspaceSetup.model.choose")}
                    invalid={!!errors.model}
                    onSelect={(option) => setForm("pinnedModel", option ?? undefined)}
                  />
                  <Show when={errors.model}>
                    <p class="workspace-setup-dialog-error">{errors.model}</p>
                  </Show>
                </Show>
                <Show when={form.modelMode === "auto"}>
                  <Field class="w-full">
                    <Field.Label class="workspace-setup-dialog-label">
                      {language.t("workspaceSetup.preference.label")}
                    </Field.Label>
                    <Select
                      options={["cost-first", "balanced", "quality-first"] as const}
                      current={form.preference}
                      value={(option) => option}
                      label={(option) => language.t(`workspaceSetup.preference.${option}`)}
                      onSelect={(option) => option && setForm("preference", option)}
                    />
                  </Field>
                </Show>
              </div>
            </Field>

            <Divider />

            <Field class="w-full">
              <div class="flex items-center gap-2">
                <Switch checked={form.qwenEnabled} onChange={(enabled) => setForm("qwenEnabled", enabled)}>
                  {language.t("workspaceSetup.qwen.enable")}
                </Switch>
              </div>
              <Show when={form.qwenEnabled}>
                <div class="mt-3 flex flex-col gap-3">
                  <Field class="w-full">
                    <Field.Label class="workspace-setup-dialog-label">
                      {language.t("workspaceSetup.qwen.baseUrl")}
                    </Field.Label>
                    <TextInput
                      value={form.qwenBaseUrl}
                      onInput={(event) => setForm("qwenBaseUrl", event.currentTarget.value)}
                      invalid={!!errors.qwenBaseUrl}
                    />
                    <Show when={errors.qwenBaseUrl}>
                      <p class="workspace-setup-dialog-error">{errors.qwenBaseUrl}</p>
                    </Show>
                  </Field>
                  <div class="grid grid-cols-2 gap-3">
                    <Field class="w-full">
                      <Field.Label class="workspace-setup-dialog-label">
                        {language.t("workspaceSetup.qwen.model")}
                      </Field.Label>
                      <TextInput
                        value={form.qwenModel}
                        placeholder="qwen3-8-125b"
                        onInput={(event) => setForm("qwenModel", event.currentTarget.value)}
                        invalid={!!errors.qwenModel}
                      />
                      <Show when={errors.qwenModel}>
                        <p class="workspace-setup-dialog-error">{errors.qwenModel}</p>
                      </Show>
                    </Field>
                    <Field class="w-full">
                      <Field.Label class="workspace-setup-dialog-label">
                        {language.t("workspaceSetup.qwen.provider")}
                      </Field.Label>
                      <TextInput
                        value={form.qwenProvider}
                        placeholder="qwen-local"
                        onInput={(event) => setForm("qwenProvider", event.currentTarget.value)}
                      />
                      <p class="workspace-setup-dialog-hint">{language.t("workspaceSetup.qwen.provider.hint")}</p>
                    </Field>
                    <Field class="w-full">
                      <Field.Label class="workspace-setup-dialog-label">
                        {language.t("workspaceSetup.qwen.apiKey")}
                      </Field.Label>
                      <TextInput
                        type="password"
                        value={form.apiKey}
                        placeholder={language.t("workspaceSetup.qwen.apiKey.placeholder")}
                        onInput={(event) => setForm("apiKey", event.currentTarget.value)}
                      />
                      <Show when={errors.apiKey}>
                        <p class="workspace-setup-dialog-error">{errors.apiKey}</p>
                      </Show>
                    </Field>
                    <Field class="w-full">
                      <Field.Label class="workspace-setup-dialog-label">
                        {language.t("workspaceSetup.qwen.timeout")}
                      </Field.Label>
                      <TextInput
                        type="number"
                        value={String(form.qwenTimeoutMs)}
                        onInput={(event) => setForm("qwenTimeoutMs", Number(event.currentTarget.value) || 120000)}
                      />
                    </Field>
                    <Field class="w-full">
                      <Field.Label class="workspace-setup-dialog-label">
                        {language.t("workspaceSetup.qwen.maxOutputTokens")}
                      </Field.Label>
                      <TextInput
                        type="number"
                        value={String(form.qwenMaxOutputTokens)}
                        onInput={(event) => setForm("qwenMaxOutputTokens", Number(event.currentTarget.value) || 2048)}
                      />
                    </Field>
                  </div>
                  <div class="flex items-center gap-3">
                    <Button variant="neutral" disabled={testState().busy} onClick={() => void testConnection()}>
                      {language.t("workspaceSetup.qwen.test")}
                    </Button>
                    <Show when={testState().result}>
                      {(result) => (
                        <span
                          class={result().ok ? "workspace-setup-dialog-success" : "workspace-setup-dialog-error"}
                        >
                          {result().ok
                            ? language.t("workspaceSetup.qwen.test.ok", { detail: result().message })
                            : language.t("workspaceSetup.qwen.test.failed", { detail: result().message })}
                        </span>
                      )}
                    </Show>
                  </div>
                </div>
              </Show>
            </Field>

            <Field class="w-full">
              <div class="flex items-center gap-2">
                <Switch
                  checked={form.earlyCompactionEnabled}
                  onChange={(enabled) => setForm("earlyCompactionEnabled", enabled)}
                >
                  {language.t("workspaceSetup.compaction.enable")}
                </Switch>
              </div>
            </Field>
          </div>
        </Show>
      </DialogBody>
      <Show when={stage() === "idle"}>
        <DialogFooter>
          <Button variant="neutral" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="contrast" onClick={() => void submit()}>
            {language.t("workspaceSetup.submit")}
          </Button>
        </DialogFooter>
      </Show>
    </Dialog>
  )
}

function ProgressView(props: {
  stage: Stage
  error?: string
  onCancel: () => void
  onRetry: () => void
  onReset: () => void
  onClose: () => void
}) {
  const language = useLanguage()
  return (
    <div class="flex flex-col gap-4">
      <ol class="flex flex-col gap-1.5">
        <For each={STAGES}>
          {(stage) => (
            <li class="workspace-setup-dialog-stage" data-current={props.stage === stage}>
              {props.stage === stage ? "▸ " : "· "}
              {language.t(`workspaceSetup.stage.${stage}`)}
            </li>
          )}
        </For>
      </ol>
      <Show when={props.stage === "completed"}>
        <p class="workspace-setup-dialog-success">{language.t("workspaceSetup.completed")}</p>
        <DialogFooter>
          <Button variant="contrast" onClick={props.onClose}>
            {language.t("common.close")}
          </Button>
        </DialogFooter>
      </Show>
      <Show when={props.stage === "failed"}>
        <p class="workspace-setup-dialog-error">
          {language.t("workspaceSetup.failed")}
          {props.error ? ` — ${props.error}` : ""}
        </p>
        <DialogFooter>
          <Button variant="neutral" onClick={props.onReset}>
            {language.t("workspaceSetup.restart")}
          </Button>
          <Button variant="contrast" onClick={props.onRetry}>
            {language.t("workspaceSetup.retry")}
          </Button>
        </DialogFooter>
      </Show>
      <Show when={props.stage === "cancelled"}>
        <p class="workspace-setup-dialog-hint">{language.t("workspaceSetup.cancelled")}</p>
        <DialogFooter>
          <Button variant="neutral" onClick={props.onReset}>
            {language.t("workspaceSetup.restart")}
          </Button>
          <Button variant="contrast" onClick={props.onRetry}>
            {language.t("workspaceSetup.retry")}
          </Button>
        </DialogFooter>
      </Show>
      <Show when={!TERMINAL.has(props.stage)}>
        <DialogFooter>
          <Button variant="neutral" onClick={props.onCancel}>
            {language.t("common.cancel")}
          </Button>
        </DialogFooter>
      </Show>
    </div>
  )
}

/** Stages rendered in order; terminal states are handled separately. */
const STAGES: ReadonlyArray<Stage> = [
  "validating",
  "preparing_prompt",
  "generating_workspace",
  "verifying_artifacts",
  "opening_project",
  "creating_session",
  "starting_initial_task",
]
