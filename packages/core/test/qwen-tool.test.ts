import { expect, test } from "bun:test"
import { Effect } from "effect"
import { FetchHttpClient, HttpClient } from "effect/http"
import { QwenTool } from "@opencode/core/tool/plugin/qwen"
import { QwenClient } from "@opencode/core/qwen/client"

const run = (config: QwenClient.Settings, user: string) =>
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    return yield* QwenTool.attempt(http, config, user)
  }).pipe(Effect.provide(FetchHttpClient.layer))

const toolConfig = (base_url: string): QwenClient.Settings => ({
  base_url,
  model: "qwen3-8-125b",
  timeoutMs: 10_000,
  maxOutputTokens: 2_048,
})

test("the tool retries transient failures exactly once", async () => {
  let calls = 0
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      calls++
      return calls === 1
        ? new Response(JSON.stringify({ error: { message: "busy" } }), { status: 503 })
        : Response.json({ choices: [{ message: { content: "recovered" } }] })
    },
  })
  const result = await Effect.runPromise(run(toolConfig(`http://127.0.0.1:${server.port}`), "task"))
  server.stop()
  expect(calls).toBe(2)
  expect(result.content).toBe("recovered")
})

test("the tool never resends context-length failures", async () => {
  let calls = 0
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      calls++
      return new Response(JSON.stringify({ error: { message: "request exceeds maximum context length" } }), {
        status: 400,
      })
    },
  })
  const exit = await Effect.runPromise(
    Effect.exit(run(toolConfig(`http://127.0.0.1:${server.port}`), "task")),
  )
  server.stop()
  expect(calls).toBe(1)
  expect(exit._tag).toBe("Failure")
})

test("tool output reports honest patch and test status", () => {
  const config: QwenClient.Settings = {
    base_url: "http://127.0.0.1:1234/v1",
    model: "qwen3-8-125b",
    timeoutMs: 10_000,
    maxOutputTokens: 2_048,
  }
  const result = QwenTool.buildResult(config, { content: "proposed patch", usage: {} })
  expect(result.usage).toBe("unavailable")
  expect(result.changes_applied).toBe(false)
  expect(result.tests_executed).toBe(false)
  expect(result.tests_confirmed).toBe(false)
  expect(result.note).toContain("analysis only")

  const measured = QwenTool.buildResult(config, { content: "analysis", usage: { input: 10, output: 4 } })
  expect(measured.usage).toEqual({ input: 10, output: 4 })
  expect(measured.changes_applied).toBe(false)
})
