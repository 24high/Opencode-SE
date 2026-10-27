<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">開源的 AI Coding Agent。</p>
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

### 自動模型路由

OpenCode 可以為每一個步驟選擇模型，而不是整個工作階段固定使用同一個模型：本地或較便宜的模型承擔日常作業，最強的模型則保留給真正需要的部分。在你開啟 `routing.enabled` 之前，路由一直處於關閉狀態。

在模型選擇器中選擇 **Auto (Routing)**，讓工作階段自動路由。如果選擇了特定模型，該工作階段就會被釘選在此模型上，路由不會介入。

| 層級    | 預設                                   | 負責的範圍                                                                       |
| ------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Local   | `qwen` 設定中的模型                    | 實作、測試、重構，以及用來驗證它們的建置與 shell 步驟                            |
| Routine | 目前最便宜的 DeepSeek Flash 模型       | 規劃、分析、審查、說明以及一般除錯                                               |
| Pro     | 目前最強的 DeepSeek 模型               | 架構與大型重構、困難除錯、涉及安全的工作                                        |

- 你最近的一次請求決定基礎分類，接著這一輪中的每個步驟都會根據本輪已經做過的事重新分類：只有讀取與搜尋的步驟會留在 Routine 層級。一旦某個步驟修改了檔案或執行了命令，本輪剩下的步驟會持續在 Local 層級執行。連續兩個步驟出現失敗的工具呼叫會被判定為困難除錯並交給 Pro 層級。設定 `routing.step_routing: false` 可以讓整輪維持同一個層級。
- 只有當該層級的模型已啟用、目前健康，而且對話仍在它的內容視窗內時，才會使用該層級。
- 累積 `routing.attempts` 次失敗後，工作會升級到下一個層級，而且出問題的模型會在一段冷卻時間內被跳過。中斷一次執行永遠不會被算成模型故障。
- `routing.preference` 在成本與品質之間取捨：`cost-first`、`balanced`（預設）或 `quality-first`。每次路由改用不同模型時，工作階段都會顯示一條簡短說明，寫明模型、層級與選擇原因（`routing.diagnostics`）。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // 任何相容 OpenAI 的服務：llama.cpp、Ollama、vLLM、LM Studio 等
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
    // 選填。未指定的角色會從模型目錄自動尋找。
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### 工作區設定精靈

應用程式可以為你建立整個專案工作區：產生工作區產物、驗證它們、開啟專案，並在工作階段中啟動第一個工作。從專案首頁開啟 **New project workspace**（標題列中的網格圖示），或透過命令面板執行。精靈會詢問：專案說明與用於產生的目錄、輸出語言、模型選擇（自動三模型路由，或釘選一個模型並設定 `cost-first`、`balanced`、`quality-first` 偏好）、選填的本地模型（基礎 URL、模型 ID、供應商 ID、選填 API 金鑰、逾時時間、最大輸出 token 數）並提供連線測試，以及是否啟用提前的、考量成本的壓縮。接著它會依序執行各個可見階段，並把完成初始工作的工作階段維持開啟；失敗的階段可以恢復，取消的執行會保留已經建立的檔案。

磁碟上不會寫入任何機密：選填的本地 API 金鑰會存入憑證儲存，產生的專案 `opencode.json` 中只可能出現它的環境變數名稱。該專案設定會把相同的路由與壓縮決策套用到此專案的後續工作。

### 自動壓縮

長時間的工作階段會被摘要成一個持久性的檢查點，讓對話仍能容納在模型的視窗中。兩個獨立的觸發器共用這套機制。

**內容上限壓縮**預設開啟（`compaction.auto`）：當估算的請求越過模型的上限時會執行。檢查點會逐字保留對話最近的 `compaction.keep.tokens`（預設 15,000）個 token，並摘要其餘部分。這是安全網：只要下面的提前壓縮跳過，它就一定會執行。

**提前的、考量成本的壓縮**需要手動開啟（`compaction.early.enabled`，預設關閉），它會在上限還未臨近之前行動，趁內容仍然便宜時清理過時的部分。只有當整個內容至少達到 `min_tokens`（24,000），而且可移除部分本身就值至少 `min_benefit_tokens`（8,000）個 token 時才會執行，每個工作階段最多每 `cooldown_seconds`（300）秒一次。`require_task_boundary` 會等待自然的斷點——新的使用者輸入，或一個沒有呼叫工具就結束的步驟；它預設為 `true`，但一次工具呼叫輪永遠不會遇到這樣的斷點，所以要讓長的 agent 輪次真的被壓縮，應該設為 `false`。`local_summarize` 會把摘要本身交給設定的本地模型，並記錄該模型的用量與成本。

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

一次壓縮執行需要為它自己的摘要保留輸出空間。如果本地模型的 `limit.output` 較小（例如 8,192），在很大的工作階段上就可能耗盡，並以 `Compaction summary reached the output token limit` 失敗——遇到這種情況請提高該上限，或關閉 `local_summarize`。

### 安裝

```bash
# 直接安裝 (YOLO)
curl -fsSL https://opencode.ai/v2/install | bash

# 套件管理員
npm i -g @opencode/cli@latest      # 也可使用 bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS 與 Linux（推薦，始終保持最新）
brew install opencode              # macOS 與 Linux（官方 brew formula，更新頻率較低）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # 任何作業系統
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> 安裝前請先移除 0.1.x 以前的舊版本。

### 桌面應用程式 (BETA)

OpenCode 也提供桌面版應用程式。您可以從 [opencode.ai/download](https://opencode.ai/download) 下載。

| 平台                  | 下載連結                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, 或 AppImage        |

```bash
# macOS (Homebrew Cask)
brew install --cask opencode-desktop
```

#### 安裝目錄

安裝腳本會依據以下優先順序決定安裝路徑：

1. `$OPENCODE_INSTALL_DIR` - 自定義安裝目錄
2. `$XDG_BIN_DIR` - 符合 XDG 基礎目錄規範的路徑
3. `$HOME/bin` - 標準使用者執行檔目錄 (若存在或可建立)
4. `$HOME/.opencode/bin` - 預設備用路徑

```bash
# 範例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode 內建了兩種 Agent，您可以使用 `Tab` 鍵快速切換。

- **build** - 預設模式，具備完整權限的 Agent，適用於開發工作。
- **plan** - 唯讀模式，適用於程式碼分析與探索。
  - 預設禁止修改檔案。
  - 執行 bash 指令前會詢問權限。
  - 非常適合用來探索陌生的程式碼庫或規劃變更。

此外，OpenCode 還包含一個 **general** 子 Agent，用於處理複雜搜尋與多步驟任務。此 Agent 供系統內部使用，亦可透過在訊息中輸入 `@general` 來呼叫。

了解更多關於 [Agents](https://opencode.ai/docs/agents) 的資訊。

### 線上文件

關於如何設定 OpenCode 的詳細資訊，請參閱我們的 [**官方文件**](https://opencode.ai/docs)。

### 參與貢獻

如果您有興趣參與 OpenCode 的開發，請在提交 Pull Request 前先閱讀我們的 [貢獻指南 (Contributing Docs)](./CONTRIBUTING.md)。

### 基於 OpenCode 進行開發

如果您正在開發與 OpenCode 相關的專案，並在名稱中使用了 "opencode"（例如 "opencode-dashboard" 或 "opencode-mobile"），請在您的 README 中加入聲明，說明該專案並非由 OpenCode 團隊開發，且與我們沒有任何隸屬關係。

---

**加入我們的社群** [飞书](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=52ao9352-5623-4fa0-b7dd-3407c392c1af&qr_code=true) | [X.com](https://x.com/opencode)
