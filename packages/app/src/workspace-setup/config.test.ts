import { expect, test } from "bun:test"
import { WorkspaceSetupConfig as Config } from "./config"

const base = () => ({
  description: "A scheduler service",
  directory: "/projects/scheduler",
  outputLanguage: "English" as const,
  modelMode: "auto" as const,
  preference: "balanced" as const,
  qwenEnabled: false,
  qwen: {
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "qwen3-8-125b",
    provider: "qwen-local",
    apiKeyEnv: "",
    timeoutMs: 120000,
    maxOutputTokens: 2048,
  },
  earlyCompactionEnabled: true,
})

test("the config block is deterministic JSON without secrets", () => {
  const first = Config.buildConfigBlock(base())
  const second = Config.buildConfigBlock(base())
  expect(first).toBe(second)
  const parsed = JSON.parse(first)
  expect(parsed.routing).toEqual({ enabled: true, preference: "balanced", diagnostics: true })
  expect(parsed.compaction).toEqual({
    auto: true,
    early: {
      enabled: true,
      min_tokens: 24000,
      min_benefit_tokens: 8000,
      cooldown_seconds: 300,
      require_task_boundary: true,
      local_summarize: false,
    },
  })
  expect(first).not.toContain("apiKey")
  expect(first).not.toContain("api_key")
})

test("a pinned model is recorded as the explicit routine role", () => {
  const parsed = JSON.parse(
    Config.buildConfigBlock({
      ...base(),
      modelMode: "pin",
      pinnedModel: { providerID: "deepseek", modelID: "deepseek-v4-flash" },
    }),
  )
  expect(parsed.routing.roles).toEqual({ routine: "deepseek/deepseek-v4-flash" })
})

test("qwen settings and the native provider entry are emitted when enabled", () => {
  const input = {
    ...base(),
    qwenEnabled: true,
    qwen: {
      ...base().qwen,
      apiKeyEnv: "QWEN_API_KEY",
      timeoutMs: 30000,
      maxOutputTokens: 1024,
      temperature: 0.2,
    },
  }
  const parsed = JSON.parse(Config.buildConfigBlock(input))
  expect(parsed.qwen).toEqual({
    base_url: "http://127.0.0.1:1234/v1",
    model: "qwen3-8-125b",
    provider: "qwen-local",
    api_key_env: "QWEN_API_KEY",
    timeout_ms: 30000,
    max_output_tokens: 1024,
    temperature: 0.2,
  })
  expect(parsed.providers["qwen-local"].package).toBe("@opencode/ai/providers/openai-compatible")
  expect(parsed.providers["qwen-local"].settings).toEqual({
    baseURL: "http://127.0.0.1:1234/v1",
    provider: "qwen-local",
  })
  // Early compaction switches to local summarization when qwen is enabled.
  expect(parsed.compaction.early.local_summarize).toBe(true)
})

test("validation requires description, directory, and qwen fields", () => {
  expect(
    Config.validateSetup({ description: " ", directory: "", outputLanguage: "English", qwenEnabled: false, qwen: base().qwen }),
  ).toEqual({ description: "Project description is required", directory: "Project directory is required" })
  expect(
    Config.validateSetup({ description: "x", directory: "/p", outputLanguage: "English", qwenEnabled: true, qwen: base().qwen }),
  ).toEqual({})
  const badURL = Config.validateSetup({
    description: "x",
    directory: "/p",
    outputLanguage: "English",
    qwenEnabled: true,
    qwen: { ...base().qwen, baseUrl: "not a url", model: "" },
  })
  expect(badURL.qwenBaseUrl).toBe("Base URL must be an http:// or https:// URL")
  expect(badURL.qwenModel).toBe("Model ID is required for the local model")
})

test("session metadata carries routing and qwen settings without secrets", () => {
  const auto = Config.buildSessionMetadata({
    modelMode: "auto",
    preference: "cost-first",
    qwenEnabled: false,
    qwen: base().qwen,
  })
  expect(auto["opencode.routing"]).toEqual({ enabled: true, preference: "cost-first", diagnostics: true })
  expect(auto["opencode.qwen"]).toBeUndefined()

  const pinned = Config.buildSessionMetadata({
    modelMode: "pin",
    pinnedModel: { providerID: "deepseek", modelID: "deepseek-v4-pro" },
    preference: "balanced",
    qwenEnabled: true,
    qwen: { ...base().qwen, apiKeyEnv: "QWEN_API_KEY" },
  })
  expect(pinned["opencode.routing"]).toEqual({
    enabled: true,
    preference: "balanced",
    diagnostics: true,
    roles: { routine: "deepseek/deepseek-v4-pro" },
  })
  expect(pinned["opencode.qwen"]).toEqual({
    base_url: "http://127.0.0.1:1234/v1",
    model: "qwen3-8-125b",
    provider: "qwen-local",
    api_key_env: "QWEN_API_KEY",
    timeout_ms: 120000,
    max_output_tokens: 2048,
  })
  // The API key itself is never part of the metadata.
  expect(JSON.stringify(pinned)).not.toContain("apiKey")
})
