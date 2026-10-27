<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Trợ lý lập trình AI mã nguồn mở.</p>
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

### Tự động định tuyến mô hình

OpenCode có thể chọn một mô hình cho từng bước thay vì giữ một mô hình suốt phiên: một mô hình cục bộ hoặc rẻ làm phần việc thường xuyên, còn mô hình mạnh nhất được dành cho những phần thực sự cần nó. Định tuyến tắt cho đến khi bạn bật `routing.enabled`.

Chọn **Auto (Routing)** trong trình chọn mô hình để định tuyến phiên một cách tự động. Nếu chọn một mô hình cụ thể, phiên sẽ bị ghim vào mô hình đó và định tuyến không can thiệp.

| Cấp     | Mặc định                             | Phụ trách                                                                       |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | mô hình trong cấu hình `qwen` của bạn | triển khai, thử nghiệm, tái cấu trúc và các bước build cũng như shell để kiểm chứng chúng |
| Routine | mô hình DeepSeek Flash đang bật rẻ nhất | lập kế hoạch, phân tích, xem xét, giải thích và gỡ lỗi thông thường    |
| Pro     | mô hình DeepSeek đang bật mạnh nhất  | kiến trúc và tái cấu trúc lớn, gỡ lỗi khó, công việc nhạy cảm về bảo mật         |

- Yêu cầu gần nhất của bạn đặt ra phân loại gốc, sau đó mỗi bước trong lượt được phân loại lại dựa trên những gì lượt đã làm: các bước chỉ đọc và tìm kiếm vẫn ở cấp Routine. Khi một bước đã sửa tệp hoặc chạy lệnh, phần còn lại của lượt tiếp tục thực thi ở cấp Local. Hai bước liên tiếp có lời gọi công cụ thất bại được coi là gỡ lỗi khó và chuyển sang cấp Pro. Với `routing.step_routing: false`, một lượt giữ nguyên một cấp.
- Một cấp chỉ được dùng khi mô hình đó được bật và đang khỏe, và cuộc hội thoại vẫn nằm trong cửa sổ ngữ cảnh của nó.
- Sau `routing.attempts` lần thất bại, công việc được nâng lên cấp kế tiếp và mô hình lỗi sẽ bị bỏ qua trong một thời gian chờ ngắn. Việc gián đoạn một lượt chạy không bao giờ tính là lỗi mô hình.
- `routing.preference` cân bằng giữa chi phí và chất lượng: `cost-first`, `balanced` (mặc định) hoặc `quality-first`. Mỗi lần đổi mô hình, phiên hiển thị một ghi chú ngắn nêu mô hình, cấp và lý do (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Bất kỳ máy chủ tương thích OpenAI nào: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Tuỳ chọn. Các vai trò chưa đặt sẽ lấy từ danh mục.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Trình hướng dẫn thiết lập không gian làm việc

Ứng dụng có thể thiết lập toàn bộ không gian làm việc của dự án giúp bạn: nó tạo ra các tài sản, kiểm chứng chúng, mở dự án và bắt đầu tác vụ đầu tiên trong một phiên. Hãy mở **New project workspace** từ trang chủ dự án (biểu tượng lưới ở thanh tiêu đề) hoặc từ bảng lệnh. Trình hướng dẫn hỏi mô tả dự án và thư mục đích, ngôn ngữ đầu ra, lựa chọn mô hình (định tuyến tự động ba mô hình hoặc một mô hình bị ghim kèm ưu tiên `cost-first`, `balanced`, `quality-first`), tuỳ chọn một mô hình cục bộ (URL cơ sở, ID mô hình, ID nhà cung cấp, khoá API tuỳ chọn, thời gian chờ và số token đầu ra tối đa) cùng một bước thử kết nối, và có bật tính nén sớm có cân nhắc chi phí hay không. Sau đó nó lần lượt chạy qua các giai đoạn hiển thị và để mở phiên chứa tác vụ ban đầu; một giai đoạn thất bại có thể được tiếp tục, còn một lượt chạy bị huỷ vẫn giữ các tệp đã tạo.

Không có gì bí mật được ghi ra đĩa: khoá API cục bộ tuỳ chọn đi vào kho lưu thông tin xác thực và chỉ tên biến môi trường của nó có thể xuất hiện trong tệp `opencode.json` của dự án được tạo ra. Tệp này áp dụng các quyết định định tuyến và nén tương tự cho công việc sau đó trong dự án.

### Tự động nén

Các phiên dài được tóm tắt thành một mốc bền để cuộc hội thoại vẫn nằm trong cửa sổ của mô hình. Hai cơ chế kích hoạt độc lập dùng chung bộ máy này.

**Nén theo giới hạn ngữ cảnh** bật mặc định (`compaction.auto`): nó chạy khi yêu cầu ước tính vượt quá trần của mô hình, giữ nguyên văn `compaction.keep.tokens` gần nhất (mặc định 15.000) và tóm tắt phần còn lại.

**Nén sớm có cân nhắc chi phí** là tuỳ chọn (`compaction.early.enabled`) và tác động trước khi giới hạn hiện ra: nó chỉ chạy khi toàn bộ ngữ cảnh đạt ít nhất `min_tokens` (24.000) và phần có thể bỏ đi tự nó đáng giá ít nhất `min_benefit_tokens` (8.000) token, tối đa một lần mỗi `cooldown_seconds` (300) cho mỗi phiên. `require_task_boundary` khiến nó chờ một điểm ngắt tự nhiên; mặc định là `true`, nhưng một lượt gọi công cụ không bao giờ chạm tới điểm ngắt đó, nên `false` mới là giá trị khiến các lượt tác tử dài thực sự được nén. `local_summarize` gửi bản tóm tắt tới mô hình cục bộ đã cấu hình và ghi nhận mức sử dụng cùng chi phí của mô hình đó.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Một lượt nén cần chỗ đầu ra cho chính bản tóm tắt; một mô hình cục bộ với `limit.output` nhỏ có thể hết chỗ và thất bại với `Compaction summary reached the output token limit` — hãy nâng giới hạn đó hoặc để `local_summarize` tắt khi bạn gặp lỗi này.

### Cài đặt

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Các trình quản lý gói (Package managers)
npm i -g @opencode/cli@latest      # hoặc bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS và Linux (khuyên dùng, luôn cập nhật)
brew install opencode              # macOS và Linux (công thức brew chính thức, ít cập nhật hơn)
sudo pacman -S opencode            # Arch Linux (Bản ổn định)
paru -S opencode-beta              # Arch Linux (Bản mới nhất từ AUR)
mise use -g opencode               # Mọi hệ điều hành
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Hãy xóa các phiên bản cũ hơn 0.1.x trước khi cài đặt.

### Ứng dụng Desktop (BETA)

OpenCode cũng có sẵn dưới dạng ứng dụng desktop. Tải từ [opencode.ai/download](https://opencode.ai/download).

| Nền tảng              | Tải xuống                          |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, hoặc AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Thư mục cài đặt

Tập lệnh cài đặt tuân theo thứ tự ưu tiên sau cho đường dẫn cài đặt:

1. `$OPENCODE_INSTALL_DIR` - Thư mục cài đặt tùy chỉnh
2. `$XDG_BIN_DIR` - Đường dẫn tuân thủ XDG Base Directory Specification
3. `$HOME/bin` - Thư mục nhị phân tiêu chuẩn của người dùng (nếu tồn tại hoặc có thể tạo)
4. `$HOME/.opencode/bin` - Mặc định dự phòng

```bash
# Ví dụ
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents (Đại diện)

OpenCode bao gồm hai agent được tích hợp sẵn mà bạn có thể chuyển đổi bằng phím `Tab`.

- **build** - Agent mặc định, có toàn quyền truy cập cho công việc lập trình
- **plan** - Agent chỉ đọc dùng để phân tích và khám phá mã nguồn
  - Mặc định từ chối việc chỉnh sửa tệp
  - Hỏi quyền trước khi chạy các lệnh bash
  - Lý tưởng để khám phá các codebase lạ hoặc lên kế hoạch thay đổi

Ngoài ra còn có một subagent **general** dùng cho các tìm kiếm phức tạp và tác vụ nhiều bước.
Agent này được sử dụng nội bộ và có thể gọi bằng cách dùng `@general` trong tin nhắn.

Tìm hiểu thêm về [agents](https://opencode.ai/docs/agents).

### Tài liệu

Để biết thêm thông tin về cách cấu hình OpenCode, [**hãy truy cập tài liệu của chúng tôi**](https://opencode.ai/docs).

### Đóng góp

Nếu bạn muốn đóng góp cho OpenCode, vui lòng đọc [tài liệu hướng dẫn đóng góp](./CONTRIBUTING.md) trước khi gửi pull request.

### Xây dựng trên nền tảng OpenCode

Nếu bạn đang làm việc trên một dự án liên quan đến OpenCode và sử dụng "opencode" như một phần của tên dự án, ví dụ "opencode-dashboard" hoặc "opencode-mobile", vui lòng thêm một ghi chú vào README của bạn để làm rõ rằng dự án đó không được xây dựng bởi đội ngũ OpenCode và không liên kết với chúng tôi dưới bất kỳ hình thức nào.

---

**Tham gia cộng đồng của chúng tôi** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
