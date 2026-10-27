<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">オープンソースのAIコーディングエージェント。</p>
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

### 自動モデルルーティング

OpenCode はセッション全体で一つのモデルを固定する代わりに、ステップごとにモデルを選びます。ローカルまたは安価なモデルが通常作業を担当し、最も強いモデルは本当に必要な部分のために温存されます。`routing.enabled` をオンにするまでルーティングはオフのままです。

モデルピッカーで **Auto (Routing)** を選ぶと、セッションが自動的にルーティングされます。特定のモデルを選ぶとそのセッションは固定され、ルーティングは干渉しません。

| 階層    | デフォルト                           | 担当する範囲                                                                     |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | `qwen` 設定のモデル                  | 実装、テスト、リファクタリング、およびそれらを検証するビルドやシェルのステップ   |
| Routine | 最も安価な有効な DeepSeek Flash モデル | 計画、分析、レビュー、説明、通常のデバッグ                                     |
| Pro     | 最も強力な有効な DeepSeek モデル     | アーキテクチャや大規模リファクタリング、難しいデバッグ、セキュリティに敏感な作業 |

- 直近のリクエストが基本的な分類を決め、その後のターンの内部では、そのターンがすでにやったことをもとに各ステップが再分類されます。読み取りと検索だけをしているステップは Routine 階層にとどまります。あるステップがファイルを変更するかコマンドを実行した時点で、ターン残り部分は Local 階層で実行を続けます。ツール呼び出しが失敗したステップが二つ続くと難しいデバッグとみなされ、Pro 階層へ渡されます。`routing.step_routing: false` にするとターン全体が一つの階層のままになります。
- ある階層が使われるのは、そのモデルが有効で現在健全であり、かつ対話がまだそのコンテキストウィンドウに収まる場合だけです。
- `routing.attempts` 回の失敗で作業は次の階層へエスカレートし、失敗しているモデルは短いクールダウン期間中スキップされます。実行を中断することはモデルの失敗としてカウントされません。
- `routing.preference` はコストと品質のバランスを決めます: `cost-first`、`balanced`（デフォルト）、`quality-first`。ルーティングが別のモデルを選ぶたびに、セッションはそのモデル・階層・選択理由を書いた短いメモを表示します（`routing.diagnostics`）。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // OpenAI 互換サーバーなら何でも: llama.cpp、Ollama、vLLM、LM Studio など
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
    // 省略可。未指定のロールはカタログから検出されます。
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### ワークスペースセットアップウィザード

アプリはプロジェクトのワークスペース一式をセットアップできます。成果物を生成し、検証し、プロジェクトを開き、セッションで最初のタスクを開始します。プロジェクトのホーム（ヘッダーのグリッドアイコン）から **New project workspace** を開くか、コマンドパレットから実行してください。ウィザードは、プロジェクトの説明と生成先ディレクトリ、出力言語、モデル選択（自動の3モデルルーティング、または固定モデルに `cost-first`、`balanced`、`quality-first` の設定を加えたもの）、任意でローカルモデル（ベース URL、モデル ID、プロバイダー ID、任意の API キー、タイムアウト、最大出力トークン）と接続テスト、そして早期のコスト考慮型コンパクションを有効にするかどうかを尋ねます。その後、目に見えるステージを進め、初期タスクのセッションを開いた状態で残します。失敗したステージは再開でき、キャンセルした実行はすでに作成したファイルを残します。

秘密情報はディスクに書き込まれません: 任意のローカル API キーは資格情報ストアに保存され、生成されるプロジェクトの `opencode.json` に現れるのはその環境変数名だけです。このファイルは、そのプロジェクトでの以降の作業にも同じルーティングとコンパクションの決定を適用します。

### 自動コンパクション

長いセッションは、対話がモデルのウィンドウに収まり続けるよう、永続的なチェックポイントに要約されます。二つの独立したトリガーがこの仕組みを共有します。

**コンテキスト上限コンパクション**はデフォルトでオンです（`compaction.auto`）。推定リクエストがモデルの上限（ウィンドウから 10%、または少なくとも 16,000 トークンを引いた値、あるいは `compaction.buffer` を設定した場合はその値）を超えたときに実行されます。チェックポイントは会話の直近 `compaction.keep.tokens`（デフォルト 15,000）をそのまま保持し、残りを要約します。これは安全網で、以下の早期トリガーがスキップした場合でも必ず動きます。

**早期コスト考慮型コンパクション**はオプトインです（`compaction.early.enabled`、デフォルトオフ）。上限が見える前に働き、コンテキストが古くなった部分を安いうちに整理します。実行されるのは、コンテキスト全体が `min_tokens`（24,000）以上で、除去できる部分単体が `min_benefit_tokens`（8,000）トークン以上の価値がある場合だけであり、セッションごとに `cooldown_seconds`（300）秒に最大一度です。`require_task_boundary` は自然な切れ目を待ちます。デフォルトは `true` ですが、ツール呼び出しのターンはそういう切れ目に決して到達しないため、長いエージェントターンを実際にコンパクションさせるには `false` にします。`local_summarize` は要約そのものを設定済みのローカルモデルに送り、そのモデルの使用量とコストを記録します。

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

コンパクションの実行は自身の要約のために出力領域を必要とします。`limit.output` が小さいローカルモデル（たとえば 8,192）は巨大なセッションで使い切り、`Compaction summary reached the output token limit` で失敗することがあります。その場合は上限を引き上げるか、`local_summarize` をオフにしてください。

### インストール

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# パッケージマネージャー
npm i -g @opencode/cli@latest      # bun/pnpm/yarn でもOK
brew install anomalyco/tap/opencode-v2 # macOS と Linux（推奨。常に最新）
brew install opencode              # macOS と Linux（公式 brew formula。更新頻度は低め）
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # どのOSでも
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> インストール前に 0.1.x より古いバージョンを削除してください。

### デスクトップアプリ (BETA)

OpenCode はデスクトップアプリとしても利用できます。[opencode.ai/download](https://opencode.ai/download) からダウンロードしてください。

| プラットフォーム      | ダウンロード                       |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`、`.rpm`、または AppImage    |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### インストールディレクトリ

インストールスクリプトは、インストール先パスを次の優先順位で決定します。

1. `$OPENCODE_INSTALL_DIR` - カスタムのインストールディレクトリ
2. `$XDG_BIN_DIR` - XDG Base Directory Specification に準拠したパス
3. `$HOME/bin` - 標準のユーザー用バイナリディレクトリ（存在する場合、または作成できる場合）
4. `$HOME/.opencode/bin` - デフォルトのフォールバック

```bash
# 例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode には組み込みの Agent が2つあり、`Tab` キーで切り替えられます。

- **build** - デフォルト。開発向けのフルアクセス Agent
- **plan** - 分析とコード探索向けの読み取り専用 Agent
  - デフォルトでファイル編集を拒否
  - bash コマンド実行前に確認
  - 未知のコードベース探索や変更計画に最適

また、複雑な検索やマルチステップのタスク向けに **general** サブ Agent も含まれています。
内部的に使用されており、メッセージで `@general` と入力して呼び出せます。

[agents](https://opencode.ai/docs/agents) の詳細はこちら。

### ドキュメント

OpenCode の設定については [**ドキュメント**](https://opencode.ai/docs) を参照してください。

### コントリビュート

OpenCode に貢献したい場合は、Pull Request を送る前に [contributing docs](./CONTRIBUTING.md) を読んでください。

### OpenCode の上に構築する

OpenCode に関連するプロジェクトで、名前に "opencode"（例: "opencode-dashboard" や "opencode-mobile"）を含める場合は、そのプロジェクトが OpenCode チームによって作られたものではなく、いかなる形でも関係がないことを README に明記してください。

---

**コミュニティに参加** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
