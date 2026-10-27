export * as WorkspaceSetupConfig from "./config.js"

import type { JsonValue } from "@opencode/client/promise"

/** Output languages offered by the wizard; used for generated artifacts only. */
export const OUTPUT_LANGUAGES = ["English", "German"] as const
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]

export type RoutingPreference = "cost-first" | "balanced" | "quality-first"

export interface QwenSettingsInput {
  baseUrl: string
  model: string
  provider: string
  apiKeyEnv?: string
  timeoutMs?: number
  maxOutputTokens?: number
  temperature?: number
}

export interface SetupSettings {
  description: string
  directory: string
  outputLanguage: OutputLanguage
  modelMode: "auto" | "pin"
  pinnedModel?: { providerID: string; modelID: string }
  preference: RoutingPreference
  qwenEnabled: boolean
  qwen: QwenSettingsInput
  earlyCompactionEnabled: boolean
}

/**
 * Builds the project-scoped `opencode.json` block the workspace generation
 * writes. Never contains secrets: the optional local API key lives in the
 * credential store, referenced only through the optional environment variable
 * name. Deterministic: identical input produces byte-identical JSON.
 */
export const buildConfigBlock = (input: SetupSettings): string => {
  const config: Record<string, unknown> = {
    routing: {
      enabled: true,
      preference: input.preference,
      diagnostics: true,
      ...(input.modelMode === "pin" && input.pinnedModel
        ? { roles: { routine: `${input.pinnedModel.providerID}/${input.pinnedModel.modelID}` } }
        : {}),
    },
  }

  if (input.qwenEnabled) {
    config.qwen = {
      base_url: input.qwen.baseUrl,
      model: input.qwen.model,
      ...(input.qwen.provider ? { provider: input.qwen.provider } : {}),
      ...(input.qwen.apiKeyEnv ? { api_key_env: input.qwen.apiKeyEnv } : {}),
      ...(input.qwen.timeoutMs === undefined ? {} : { timeout_ms: input.qwen.timeoutMs }),
      ...(input.qwen.maxOutputTokens === undefined ? {} : { max_output_tokens: input.qwen.maxOutputTokens }),
      ...(input.qwen.temperature === undefined ? {} : { temperature: input.qwen.temperature }),
    }
    if (input.qwen.provider)
      config.providers = {
        [input.qwen.provider]: {
          package: "@opencode/ai/providers/openai-compatible",
          settings: { baseURL: input.qwen.baseUrl, provider: input.qwen.provider },
          models: {
            [input.qwen.model]: {
              modelID: input.qwen.model,
              name: `Local Qwen (${input.qwen.model})`,
              limit: { context: 32768, output: 8192 },
              cost: { input: 0, output: 0 },
            },
          },
        },
      }
  }

  if (input.earlyCompactionEnabled)
    config.compaction = {
      auto: true,
      early: {
        enabled: true,
        min_tokens: 24000,
        min_benefit_tokens: 8000,
        cooldown_seconds: 300,
        require_task_boundary: true,
        local_summarize: input.qwenEnabled,
      },
    }

  return JSON.stringify(config, null, 2)
}

export interface ValidationErrors {
  description?: string
  directory?: string
  outputLanguage?: string
  model?: string
  qwenBaseUrl?: string
  qwenModel?: string
  apiKey?: string
}

/** Pure field validation; directory writability is checked against the real filesystem by the controller. */
export const validateSetup = (input: {
  description: string
  directory: string
  outputLanguage: string
  qwenEnabled: boolean
  qwen: QwenSettingsInput
}): ValidationErrors => {
  const errors: ValidationErrors = {}
  if (input.description.trim().length === 0) errors.description = "Project description is required"
  if (input.directory.trim().length === 0) errors.directory = "Project directory is required"
  if (!OUTPUT_LANGUAGES.includes(input.outputLanguage as OutputLanguage))
    errors.outputLanguage = "Unsupported output language"
  if (input.qwenEnabled) {
    if (input.qwen.baseUrl.trim().length === 0) errors.qwenBaseUrl = "Base URL is required for the local model"
    else if (!isHttpUrl(input.qwen.baseUrl.trim())) errors.qwenBaseUrl = "Base URL must be an http:// or https:// URL"
    if (input.qwen.model.trim().length === 0) errors.qwenModel = "Model ID is required for the local model"
  }
  return errors
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Session-metadata overrides read by the routing service. Applied to the
 * generation and initial-task sessions so routing is active before the
 * generated `opencode.json` exists. Never contains secrets: the local API key
 * lives in the credential store, referenced only through the optional
 * environment variable name.
 */
export const buildSessionMetadata = (input: {
  modelMode: "auto" | "pin"
  pinnedModel?: { providerID: string; modelID: string }
  preference: RoutingPreference
  qwenEnabled: boolean
  qwen: QwenSettingsInput
}): Record<string, JsonValue> => {
  const routing: Record<string, JsonValue> = {
    enabled: true,
    preference: input.preference,
    diagnostics: true,
    ...(input.modelMode === "pin" && input.pinnedModel
      ? { roles: { routine: `${input.pinnedModel.providerID}/${input.pinnedModel.modelID}` } }
      : {}),
  }
  const metadata: Record<string, JsonValue> = { "opencode.routing": routing }
  if (input.qwenEnabled)
    metadata["opencode.qwen"] = {
      base_url: input.qwen.baseUrl,
      model: input.qwen.model,
      ...(input.qwen.provider ? { provider: input.qwen.provider } : {}),
      ...(input.qwen.apiKeyEnv ? { api_key_env: input.qwen.apiKeyEnv } : {}),
      ...(input.qwen.timeoutMs ? { timeout_ms: input.qwen.timeoutMs } : {}),
      ...(input.qwen.maxOutputTokens ? { max_output_tokens: input.qwen.maxOutputTokens } : {}),
    }
  return metadata
}
