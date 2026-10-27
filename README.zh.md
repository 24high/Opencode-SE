<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">开源的 AI Coding Agent。</p>
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

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### 自动模型路由

OpenCode 可以为每一个步骤选择模型，而不是整个会话固定用一个模型：本地或便宜的模型承担日常工作，最强的模型留给真正需要的部分。在你打开 `routing.enabled` 之前，路由一直处于关闭状态。

在模型选择器中选择 **Auto (Routing)**，让会话自动路由。如果选择了具体模型，该会话就会被钉选在这个模型上，路由不会干预。

| 层级    | 默认                                   | 负责的范围                                                                       |
| ------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Local   | `qwen` 配置中的模型                    | 实现、测试、重构，以及用于验证它们的构建与 shell 步骤                            |
| Routine | 当前最便宜的 DeepSeek Flash 模型       | 规划、分析、审查、解释以及常规调试                                               |
| Pro     | 当前最强的 DeepSeek 模型               | 架构与大型重构、疑难调试、涉及安全的工作                                        |

- 你最近的一次请求决定基础分类，随后这一轮中的每个步骤都会根据本轮已经做过的事情重新分类：只读取和检索的步骤留在 Routine 层。一旦某个步骤修改了文件或执行了命令，本轮余下的步骤会继续在 Local 层执行。连续两个步骤出现失败的工具调用会被判定为疑难调试并交给 Pro 层。设置 `routing.step_routing: false` 可让整轮保持同一个层级。
- 只有当该层级的模型已启用、当前健康，并且对话仍在其上下文窗口内时，该层级才会被使用。
- 累计 `routing.attempts` 次失败后，任务会升级到下一个层级，并且出问题的模型会在一段冷却时间内被跳过。中断一次运行永远不会被算作模型故障。
- `routing.preference` 在成本与质量之间权衡：`cost-first`、`balanced`（默认）或 `quality-first`。每次路由换用不同模型时，会话都会显示一条简短说明，写明模型、层级和选择原因（`routing.diagnostics`）。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // 任何兼容 OpenAI 的服务：llama.cpp、Ollama、vLLM、LM Studio 等
  "providers": {
    "local": {
      "package": "aisdk:@ai-sdk/openai-compatible",
      "settings": { "baseURL": "http://127.0.0.1:8080/v1" },
      "models": { "qwen3-coder": { "limit": { "context": 131072, "output": 8192 } } },
    },
  },
  "qwen": { "base_url": "http://127.0.0.1:8080/v1", "model": "qwen3-coder", "provider": "local" },
  "routing": {
    "enabled": true,
    "preference": "balanced",
    // 可选。未指定的角色会从模型目录中自动发现。
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### 工作区设置向导

应用可以为你搭建整个项目工作区：生成工作区产物、验证它们、打开项目，并在一个会话中启动第一个任务。在项目主页打开 **New project workspace**（标题栏中的网格图标），或者通过命令面板运行。向导会询问：项目描述和用于生成的目录、输出语言、模型选择（自动三模型路由，或钉选一个模型并设置 `cost-first`、`balanced`、`quality-first` 偏好）、可选的本地模型（基础 URL、模型 ID、提供方 ID、可选 API 密钥、超时时间、最大输出 token 数）并提供连接测试，以及是否启用提前的、考虑成本的压缩。随后它会依次执行各个可见阶段，并把完成初始任务的会话保持在打开状态；失败的阶段可以重新恢复，取消的运行会保留已经创建的文件。

磁盘上不会写入任何机密：可选的本地 API 密钥存入凭据存储，生成的项目 `opencode.json` 中只可能出现它的环境变量名。该项目配置会把相同的路由与压缩决策应用于该项目的后续工作。

### 自动压缩

长会话会被总结成一个持久的检查点，使对话继续容纳在模型的窗口中。两个相互独立的触发器共用这套机制。

**上下文上限压缩**默认开启（`compaction.auto`）：当估算的请求越过模型的上限（窗口减去 10% 的预留，或至少 16,000 个 token，或者你设置的 `compaction.buffer`）时执行。检查点会逐字保留对话最近的 `compaction.keep.tokens`（默认 15,000）个 token，并总结其余部分。这是兜底机制：即使下面的提前压缩跳过，它也总会执行。

**提前的、考虑成本的压缩**需要显式开启（`compaction.early.enabled`，默认关闭），它会在接近上限之前就行动，趁上下文仍然便宜时清理过时内容。只有当整个上下文至少达到 `min_tokens`（24,000），且可移除部分本身就值至少 `min_benefit_tokens`（8,000）个 token 时才会执行，每个会话最多每 `cooldown_seconds`（300）秒一次。`require_task_boundary` 会等待自然的断点——新的用户输入，或一个没有调用工具就结束的步骤；它默认为 `true`，但一次工具调用轮永远不会遇到这样的断点，因此要让长的 agent 轮次真正被压缩，应设为 `false`。`local_summarize` 会把总结本身交给配置的本地模型，并记录该模型的用量与成本。

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

一次压缩运行需要为它自己的总结留出输出空间。如果本地模型的 `limit.output` 较小（例如 8,192），在很大的会话上就可能耗尽，并以 `Compaction summary reached the output token limit` 失败——遇到这种情况请提高该上限，或者关闭 `local_summarize`。

### 安装

```bash
# 直接安装 (YOLO)
curl -fsSL https://opencode.ai/v2/install | bash

# 软件包管理器
npm i -g @opencode/cli@latest      # 也可使用 bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS 和 Linux（推荐，始终保持最新）
brew install opencode              # macOS 和 Linux（官方 brew formula，更新频率较低）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # 任意系统
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> 安装前请先移除 0.1.x 之前的旧版本。

### 桌面应用程序 (BETA)

OpenCode 也提供桌面版应用。可从 [opencode.ai/download](https://opencode.ai/download) 下载。

| 平台                  | 下载文件                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`、`.rpm` 或 AppImage         |

```bash
# macOS (Homebrew Cask)
brew install --cask opencode-desktop
```

#### 安装目录

安装脚本按照以下优先级决定安装路径：

1. `$OPENCODE_INSTALL_DIR` - 自定义安装目录
2. `$XDG_BIN_DIR` - 符合 XDG 基础目录规范的路径
3. `$HOME/bin` - 如果存在或可创建的用户二进制目录
4. `$HOME/.opencode/bin` - 默认备用路径

```bash
# 示例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode 内置两种 Agent，可用 `Tab` 键快速切换：

- **build** - 默认模式，具备完整权限，适合开发工作
- **plan** - 只读模式，适合代码分析与探索
  - 默认拒绝修改文件
  - 运行 bash 命令前会询问
  - 便于探索未知代码库或规划改动

另外还包含一个 **general** 子 Agent，用于复杂搜索和多步任务，内部使用，也可在消息中输入 `@general` 调用。

了解更多 [Agents](https://opencode.ai/docs/agents) 相关信息。

### 文档

更多配置说明请查看我们的 [**官方文档**](https://opencode.ai/docs)。

### 参与贡献

如有兴趣贡献代码，请在提交 PR 前阅读 [贡献指南 (Contributing Docs)](./CONTRIBUTING.md)。

### 基于 OpenCode 进行开发

如果你在项目名中使用了 “opencode”（如 “opencode-dashboard” 或 “opencode-mobile”），请在 README 里注明该项目不是 OpenCode 团队官方开发，且不存在隶属关系。

---

**加入我们的社区** [飞书](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=52ao9352-5623-4fa0-b7dd-3407c392c1af&qr_code=true) | [X.com](https://x.com/opencode)
