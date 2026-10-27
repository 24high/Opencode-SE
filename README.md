<p align="center"><h1 align="center">Opencode SE</h1></p>
<p align="center">The enhanced open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@opencode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@opencode/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

---

### Automatic Model Routing

OpenCode can choose a model for each step instead of holding one model for a whole session: a local or cheap model does the routine work and the strongest model is reserved for the parts that actually need it. It stays off until you turn on `routing.enabled`.

Pick **Auto (Routing)** in the model picker to route a session automatically. Choosing a specific model pins that session and routing leaves it alone; set `routing.escalate_pinned` to let the router move a pinned session up a tier once its model has used up its retry budget.

Routing sorts the models you have configured into three tiers:

| Tier    | Defaults to                          | Handles                                                                          |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| Local   | the model in your `qwen` config      | implementation, tests, refactors, and the build and shell steps that verify them |
| Routine | cheapest active DeepSeek Flash model | planning, analysis, review, explanations, ordinary debugging                     |
| Pro     | strongest active DeepSeek model      | architecture and large refactors, difficult debugging, security-sensitive work   |

- Your latest request sets the base classification, then every step inside the turn is re-classified from what the turn has already done. While the turn has only read and searched, its steps plan and interpret on the routine tier. Once a step has changed files or run a command, the rest of the turn keeps executing on the local tier instead of flipping back on every read. Two consecutive steps with failed tool calls are treated as difficult debugging and go to the pro tier. One prompt therefore really mixes tiers instead of locking the whole turn to one model. Set `routing.step_routing: false` to keep one tier per turn.
- Switching models mid-turn means the next model cannot reuse the previous model's prompt cache, so mixing costs a little extra on short turns; the local tier still does the bulk of the work.
- A tier is only used when the model is enabled, currently healthy, and the conversation still fits inside its context window.
- Unsuccessful steps are counted per tier. After `routing.attempts` failures the work escalates to the next tier and the failing model is skipped for a short cooldown. Interrupting a run never counts as a model failure.
- `routing.preference` trades cost against quality: `cost-first`, `balanced` (default), or `quality-first`.
- Whenever routing picks a different model, the session shows a short note naming that model, its tier, and why it was chosen (`routing.diagnostics`).
- The agent can additionally hand a bounded subtask to the same endpoint with the `delegate_to_local_qwen` tool and verify the result itself.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Any OpenAI-compatible server: llama.cpp, Ollama, vLLM, LM Studio, ...
  "providers": {
    "local": {
      "package": "aisdk:@ai-sdk/openai-compatible",
      "settings": { "baseURL": "http://127.0.0.1:8080/v1" },
      "models": {
        "qwen3-coder": { "limit": { "context": 131072, "output": 8192 } },
      },
    },
  },
  "qwen": {
    "base_url": "http://127.0.0.1:8080/v1",
    "model": "qwen3-coder",
    "provider": "local", // catalog entry above, used as the local tier
  },
  "routing": {
    "enabled": true,
    "preference": "balanced",
    // Optional. Unset roles are discovered from the catalog.
    "roles": {
      "local": "local/qwen3-coder",
      "routine": "deepseek/deepseek-chat",
      "pro": "deepseek/deepseek-reasoner",
    },
    "attempts": { "local": 2, "routine": 2 },
    // Optional, on by default. Re-classify each step inside a turn (see above).
    "step_routing": true,
  },
}
```

### Workspace Setup Wizard

The app can set up an entire project workspace for you: it generates the workspace artifacts, verifies them, opens the project, and starts the first task in a session. Open **New project workspace** from the projects home (the grid icon in the header, or the same action on a project row), or run it from the command palette.

The wizard asks for:

1. A **project description** and the **project directory** to generate into.
2. An **output language** for the generated documentation, prompts, and reports.
3. **Model selection**: automatic three-model routing, or a pinned model plus a routing preference (`cost-first`, `balanced`, `quality-first`).
4. Optionally a **local model** (base URL, model ID, provider ID, optional API key, timeout, max output tokens) with a **Test connection** check.
5. Whether to enable **early cost-aware compaction**.

It then works through visible stages — validating the directory, preparing the prompt, generating artifacts, verifying them, opening the project, creating the initial session, and starting the initial task — and leaves the finished initial task session open for you. A failed stage can be resumed, and a cancelled run leaves the files it already created in place.

The wizard writes a deterministic project-scoped `opencode.json` so the same routing decisions apply to later work in that project:

```jsonc
{
  "routing": { "enabled": true, "preference": "balanced", "diagnostics": true },
  // Only when you enabled the local model.
  "qwen": { "base_url": "http://127.0.0.1:8080/v1", "model": "qwen3-coder", "provider": "local" },
  // Only when you enabled early compaction.
  "compaction": {
    "auto": true,
    "early": {
      "enabled": true,
      "min_tokens": 24000,
      "min_benefit_tokens": 8000,
      "cooldown_seconds": 300,
      "require_task_boundary": false,
      "local_summarize": false
    }
  }
}
```

Nothing secret is written to that file: an optional local API key goes into the credential store and only its environment variable name can appear in the config. The generation and initial-task sessions also carry the routing settings as session metadata, so they are routed the same way as the project itself.

### Automatic Compaction

Long sessions are summarized into a durable checkpoint so the conversation keeps fitting the model's window. Two independent triggers share that machinery:

**Context-limit compaction** is on by default (`compaction.auto`). It runs when the estimated request crosses the model's ceiling — the window minus a reserve of 10%, or at least 16,000 tokens, or exactly `compaction.buffer` tokens when you set one. The checkpoint keeps the most recent `compaction.keep.tokens` (15,000 by default) of the conversation verbatim and summarizes the rest. This is the safety net: it still runs whenever the early trigger below skips.

**Early cost-aware compaction** is opt-in (`compaction.early.enabled`, off by default) and acts before the limit is in sight, so a session prunes obsolete context while it is still cheap to do so. It only runs when the whole context is at least `min_tokens` (24,000) and the removable part alone is worth at least `min_benefit_tokens` (8,000) tokens, at most once per `cooldown_seconds` (300) per session. With `require_task_boundary` it waits for a natural break — fresh user input, or a step that answered without calling tools. That guard defaults to `true`, but a single tool-calling turn never reaches such a break, so set it to `false` (the workspace wizard writes `false`) to also compact in the middle of a long tool-calling turn. `local_summarize` sends the summary itself to the configured local model and records that model's usage and cost instead of the session model's.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": {
      "enabled": true,
      "min_tokens": 24000,
      "min_benefit_tokens": 8000,
      "cooldown_seconds": 300,
      "require_task_boundary": false,
      "local_summarize": true
    }
  }
}
```

A compaction run needs output room for its own summary. A local model with a small `limit.output` (8,192 for example) can run out of it on a very large session and the step then fails with `Compaction summary reached the output token limit` — raise that limit, or leave `local_summarize` off, when you see it.

### Installation

```bash
bun run dev:desktop
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode SE is only available as a desktop application.

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.opencode/bin` - Default fallback

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
