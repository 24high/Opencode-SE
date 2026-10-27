import { expect, test } from "bun:test"
import { Cause, Effect, Exit } from "effect"
import { FetchHttpClient, HttpClient } from "effect/http"
import { QwenClient } from "@opencode/core/qwen/client"

const settings = (overrides: Partial<QwenClient.Settings> = {}): QwenClient.Settings => ({
  base_url: "http://127.0.0.1:1",
  model: "qwen3-8-125b",
  timeoutMs: 10_000,
  maxOutputTokens: 2_048,
  ...overrides,
})

const run = (config: QwenClient.Settings, request: QwenClient.Request) =>
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    return yield* QwenClient.chat({ http, config, request })
  }).pipe(Effect.provide(FetchHttpClient.layer))

const failureOf = async (config: QwenClient.Settings, request: QwenClient.Request): Promise<QwenClient.QwenError> => {
  const exit = await Effect.runPromise(Effect.exit(run(config, request)))
  if (!Exit.isFailure(exit)) throw new Error("expected the chat request to fail")
  const error = Cause.squash(exit.cause)
  expect(error instanceof QwenClient.QwenError).toBe(true)
  return error as QwenClient.QwenError
}

test("chat sends a bounded Chat Completions request and parses string content and usage", async () => {
  const requests: { url: string; method: string; headers: Headers; body: Record<string, unknown> }[] = []
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      requests.push({
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: (await request.json()) as Record<string, unknown>,
      })
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "analysis here" } }],
          usage: { prompt_tokens: 10, completion_tokens: 4 },
        }),
        { headers: { "Content-Type": "application/json" } },
      )
    },
  })
  const result = await Effect.runPromise(
    run(settings({ base_url: `http://127.0.0.1:${server.port}/v1/`, maxOutputTokens: 512 }), {
      system: "sys",
      user: "task",
    }),
  )
  expect(requests).toHaveLength(1)
  expect(requests[0].method).toBe("POST")
  expect(requests[0].url).toBe(`http://127.0.0.1:${server.port}/v1/chat/completions`)
  expect(requests[0].body).toEqual({
    model: "qwen3-8-125b",
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "task" },
    ],
    stream: false,
    max_tokens: 512,
  })
  expect(result.content).toBe("analysis here")
  expect(result.usage).toEqual({ input: 10, output: 4 })
  server.stop()
})

test("chat adds the bearer header only when a key is configured", async () => {
  const seen: { auth: string | null } = { auth: null }
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      seen.auth = request.headers.get("authorization")
      return Response.json({ choices: [{ message: { content: "ok" } }] })
    },
  })
  const key = "sk-local-secret"
  await Effect.runPromise(
    run(settings({ base_url: `http://127.0.0.1:${server.port}`, apiKey: key }), { system: "", user: "task" }),
  )
  expect(seen.auth).toBe(`Bearer ${key}`)

  seen.auth = null
  await Effect.runPromise(run(settings({ base_url: `http://127.0.0.1:${server.port}` }), { system: "", user: "task" }))
  expect(seen.auth).toBeNull()
  server.stop()
})

test("chat accepts content arrays, omits temperature, and leaves missing usage unavailable", async () => {
  const seen: { body: Record<string, unknown> } = { body: {} }
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      seen.body = (await request.json()) as Record<string, unknown>
      return Response.json({
        choices: [{ message: { content: [{ type: "text", text: "part one " }, { type: "text", text: "part two" }] } }],
      })
    },
  })
  const result = await Effect.runPromise(
    run(settings({ base_url: `http://127.0.0.1:${server.port}` }), { system: "", user: "task" }),
  )
  server.stop()
  expect("temperature" in seen.body).toBe(false)
  expect(result.content).toBe("part one part two")
  expect(result.usage).toEqual({})
})

test("chat maps status codes to concise errors without echoing the API key", async () => {
  const cases = [
    { status: 429, body: { error: { message: "rate limited" } }, reason: "rate-limit" },
    { status: 401, body: { error: { message: "bad key" } }, reason: "http" },
    { status: 503, body: { error: { message: "maintenance" } }, reason: "http" },
    { status: 400, body: { error: { message: "maximum context length exceeded" } }, reason: "context-length" },
  ] as const
  for (const entry of cases) {
    const server = Bun.serve({ port: 0, fetch: () => Response.json(entry.body, { status: entry.status }) })
    const error = await failureOf(
      settings({ base_url: `http://127.0.0.1:${server.port}`, apiKey: "sk-secret-value" }),
      { system: "", user: "task" },
    )
    server.stop()
    expect(error.reason).toEqual(entry.reason)
    expect(error.status).toBe(entry.status)
    expect(error.message).not.toContain("sk-secret-value")
  }
})

test("chat rejects malformed, choiceless, and empty responses", async () => {
  const bodies = ["not json", JSON.stringify({ choices: [] }), JSON.stringify({ choices: [{ message: { content: "" } }] })]
  const reasons = ["invalid-response", "invalid-response", "empty-output"] as const
  for (const [index, body] of bodies.entries()) {
    const server = Bun.serve({ port: 0, fetch: () => new Response(body) })
    const error = await failureOf(settings({ base_url: `http://127.0.0.1:${server.port}` }), { system: "", user: "task" })
    server.stop()
    expect(error.reason).toEqual(reasons[index])
  }
})

test("chat reports timeouts without fabricating usage", async () => {
  const server = Bun.serve({
    port: 0,
    async fetch() {
      await Bun.sleep(250)
      return Response.json({ choices: [{ message: { content: "late" } }] })
    },
  })
  const error = await failureOf(settings({ base_url: `http://127.0.0.1:${server.port}`, timeoutMs: 50 }), {
    system: "",
    user: "task",
  })
  server.stop()
  expect(error.reason).toBe("timeout")
})

test("chat reports connection failures when the endpoint is unreachable", async () => {
  // A closed loopback port fails fast on every platform.
  const probe = Bun.serve({ port: 0, fetch: () => Response.json({}) })
  const port = probe.port
  probe.stop()
  const error = await failureOf(settings({ base_url: `http://127.0.0.1:${port}` }), { system: "", user: "task" })
  expect(error.reason).toBe("connection")
})

test("chatURL appends the completions path without duplicating it", () => {
  expect(QwenClient.chatURL("http://127.0.0.1:1234/v1/")).toBe("http://127.0.0.1:1234/v1/chat/completions")
  expect(QwenClient.chatURL("http://host/v1/chat/completions")).toBe("http://host/v1/chat/completions")
})
