<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">เอเจนต์การเขียนโค้ดด้วย AI แบบโอเพนซอร์ส</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@opencode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@opencode/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="สถานะการสร้าง" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
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

### การเลือกโมเดลอัตโนมัติ (Routing)

OpenCode เลือกโมเดลทีละขั้นตอนได้ แทนที่จะใช้โมเดลเดียวตลอดทั้งเซสชัน: โมเดลในพื้นที่หรือโมเดลราคาถูกทำงานประจำส่วนที่ซ้ำ ๆ ส่วนโมเดลที่เก่งที่สุดจะถูกสงวนไว้สำหรับส่วนที่จำเป็นต้องใช้จริง ๆ การ routing จะปิดอยู่จนกว่าคุณจะเปิด `routing.enabled`

เลือก **Auto (Routing)** ในตัวเลือกโมเดล เพื่อให้ระบบเลือกโมเดลให้เซสชันโดยอัตโนมัติ ถ้าเลือกโมเดลใดโมเดลหนึ่ง เซสชันนั้นจะถูกตรึงกับโมเดลนั้น และการ routing จะไม่เข้ามายุ่ง

| ระดับ   | ค่าเริ่มต้น                          | รับผิดชอบ                                                                       |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | โมเดลในการตั้งค่า `qwen` ของคุณ      | การเขียนโค้ด การทดสอบ การรีแฟกตอริง และขั้นตอน build/shell ที่ใช้ตรวจสอบสิ่งเหล่านั้น |
| Routine | โมเดล DeepSeek Flash ที่ถูกที่สุดที่เปิดใช้ | การวางแผน การวิเคราะห์ การตรวจสอบโค้ด คำอธิบาย และการดีบักทั่วไป    |
| Pro     | โมเดล DeepSeek ที่เก่งที่สุดที่เปิดใช้ | โครงสร้างใหญ่ ๆ การรีแฟกตอริงขนาดใหญ่ การดีบักที่ยาก และงานที่เกี่ยวกับความปลอดภัย |

- คำขอล่าสุดของคุณเป็นตัวกำหนดการจำแนกพื้นฐาน จากนั้นแต่ละขั้นตอนใน turn เดียวกันจะถูกจำแนกใหม่จากสิ่งที่ turn นั้นทำไปแล้ว: ขั้นตอนที่แค่อ่านและค้นหาจะอยู่ที่ระดับ Routine ต่อไป เมื่อขั้นตอนใดแก้ไขไฟล์หรือรันคำสั่ง ส่วนที่เหลือของ turn จะทำงานต่อที่ระดับ Local ถ้าสองขั้นตอนติดต่อกันมีการเรียกใช้เครื่องมือที่ล้มเหลว จะถือเป็นการดีบักที่ยากและส่งต่อไปยังระดับ Pro ถ้าตั้ง `routing.step_routing: false` ทั้ง turn จะใช้ระดับเดียว
- จะใช้ระดับใดก็ต่อเมื่อโมเดลของระดับนั้นเปิดใช้และใช้งานได้ปกติในขณะนั้น และบทสนทยายังพอดีกับ context window ของโมเดลนั้น
- เมื่อล้มเหลวครบ `routing.attempts` ครั้ง งานจะถูกยกระดับไปยังระดับถัดไป และโมเดลที่ล้มเหลวจะถูกข้ามไปสักครู่หนึ่ง การหยุดการทำงานกลางคันไม่นับว่าเป็นความล้มเหลวของโมเดล
- `routing.preference` ใช้เลือกระหว่างต้นทุนกับคุณภาพ: `cost-first`, `balanced` (ค่าเริ่มต้น) หรือ `quality-first` ทุกครั้งที่ routing เลือกโมเดลที่ต่างออกไป เซสชันจะแสดงหมายเหตุสั้น ๆ บอกชื่อโมเดล ระดับ และเหตุผล (`routing.diagnostics`)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // เซิร์ฟเวอร์ที่เข้ากันได้กับ OpenAI ก็ได้: llama.cpp, Ollama, vLLM, LM Studio ฯลฯ
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
    // ไม่บังคับ ระดับที่ยังไม่ได้กำหนดจะหาจากแคตตาล็อกเอง
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### ตัวช่วยตั้งพื้นที่ทำงาน (Workspace Setup Wizard)

แอปสามารถตั้งพื้นที่ทำงานของโปรเจกต์ให้ได้ทั้งชุด: มันสร้างชิ้นงานของพื้นที่ทำงาน ตรวจสอบ เปิดโปรเจกต์ แล้วเริ่มงานแรกในเซสชัน ให้เปิด **New project workspace** จากหน้าแรกของโปรเจกต์ (ไอคอนตารางในแถบบน) หรือจาก command palette ตัวช่วยจะถามคำอธิบายโปรเจกต์และโฟลเดอร์เป้าหมาย, ภาษาของผลลัพธ์, การเลือกโมเดล (routing อัตโนมัติสามโมเดล หรือตรึงโมเดลพร้อมความชอบ `cost-first`, `balanced`, `quality-first`), ตัวเลือกโมเดลในพื้นที่ (URL พื้นฐาน, model ID, provider ID, คีย์ API ถ้ามี, timeout และจำนวน token ขาออกสูงสุด) พร้อมทดสอบการเชื่อมต่อ และว่าจะเปิดการบีบอัดล่วงหน้าแบบคำนึงถึงต้นทุนหรือไม่ จากนั้นมันจะผ่านแต่ละขั้นตอนที่มองเห็นได้และปล่อยเซสชันของงานแรกไว้ให้เปิดอยู่; ขั้นตอนที่ล้มเหลวสามารถเริ่มใหม่ได้ และการยกเลิกจะเก็บไฟล์ที่สร้างไปแล้วไว้ตามเดิม

จะไม่เขียนข้อมูลลับลงดิสก์เลย: คีย์ API ของโมเดลในพื้นที่ (ถ้ามี) จะถูกเก็บใน credential store และสิ่งที่โผล่ในไฟล์ `opencode.json` ของโปรเจกต์คือชื่อตัวแปรสภาพแวดล้อมของมันเท่านั้น ไฟล์นั้นใช้การตัดสินใจเรื่อง routing และการบีบอัดชุดเดียวกันกับงานในโปรเจกต์ต่อมา

### การบีบอัดบทสนทนาอัตโนมัติ

เซสชันที่ยาวจะถูกสรุปเป็น checkpoint ถาวรเพื่อให้บทสนทยายังพอดีกับหน้าต่างของโมเดล ตัวกระตุ้นสองตัวที่ใช้กลไกเดียวกัน:

**การบีบอัดเมื่อชนขอบเขต context** เปิดใช้เป็นค่าเริ่มต้น (`compaction.auto`) มันทำงานเมื่อประมาณขนาด request เกินเพดานของโมเดล โดยเก็บข้อความล่าสุดจำนวน `compaction.keep.tokens` (ค่าเริ่มต้น 15,000) ไว้แบบคำต่อคำ แล้วสรุปส่วนที่เหลือ นี่คือตาข่ายความปลอดภัย: มันยังทำงานเสมอ แม้ตัวกระตุ้นล่วงหน้าข้างล่างจะข้ามไป

**การบีบอัดล่วงหน้าแบบคำนึงถึงต้นทุน** ต้องเปิดเอง (`compaction.early.enabled` ปิดเป็นค่าเริ่มต้น) และทำงานก่อนที่เราจะเห็นขอบเขต เพื่อให้เซสชันตัด content ที่ล้าสมัยทิ้งตอนที่ต้นทุนยังถูก มันจะทำงานเมื่อ context ทั้งหมดยังมีอย่างน้อย `min_tokens` (24,000) และส่วนที่ตัดออกมีค่าอย่างน้อย `min_benefit_tokens` (8,000) token เท่านั้น อย่างมากที่สุดทุก ๆ `cooldown_seconds` (300) วินาทีต่อเซสชัน ค่า `require_task_boundary` ทำให้มันรอจุดหยุดธรรมชาติ ค่าเริ่มต้นคือ `true` แต่ turn ที่เรียกใช้เครื่องมือจะไม่เจอจุดหยุดแบบนั้นเลย ดังนั้นต้องตั้งเป็น `false` การบีบอัดใน turn ยาว ๆ ของเอเจนต์จึงจะเกิดขึ้นจริง ส่วน `local_summarize` จะส่งการสรุปไปยังโมเดลในพื้นที่ที่ตั้งไว้ และบันทึกการใช้กับต้นทุนของโมเดลนั้น

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

การบีบอัดหนึ่งครั้งต้องใช้พื้นที่ขาออกสำหรับสรุปของมันเอง โมเดลในพื้นที่ที่ `limit.output` น้อย (เช่น 8,192) อาจใช้หมดบนเซสชันใหญ่มาก แล้วขั้นตอนนั้นจะล้มเหลวพร้อมข้อความ `Compaction summary reached the output token limit` — เมื่อเจอแบบนี้ให้เพิ่มค่านั้นหรือปิด `local_summarize`

### การติดตั้ง

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# ตัวจัดการแพ็กเกจ
npm i -g @opencode/cli@latest      # หรือ bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS และ Linux (แนะนำ อัปเดตเสมอ)
brew install opencode              # macOS และ Linux (brew formula อย่างเป็นทางการ อัปเดตน้อยกว่า)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # ระบบปฏิบัติการใดก็ได้
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> ลบเวอร์ชันที่เก่ากว่า 0.1.x ก่อนติดตั้ง

### แอปพลิเคชันเดสก์ท็อป (เบต้า)

OpenCode มีให้ใช้งานเป็นแอปพลิเคชันเดสก์ท็อป ดาวน์โหลดจาก [opencode.ai/download](https://opencode.ai/download)

| แพลตฟอร์ม             | ดาวน์โหลด                          |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, หรือ AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### ไดเรกทอรีการติดตั้ง

สคริปต์การติดตั้งจะใช้ลำดับความสำคัญตามเส้นทางการติดตั้ง:

1. `$OPENCODE_INSTALL_DIR` - ไดเรกทอรีการติดตั้งที่กำหนดเอง
2. `$XDG_BIN_DIR` - เส้นทางที่สอดคล้องกับ XDG Base Directory Specification
3. `$HOME/bin` - ไดเรกทอรีไบนารีผู้ใช้มาตรฐาน (หากมีอยู่หรือสามารถสร้างได้)
4. `$HOME/.opencode/bin` - ค่าสำรองเริ่มต้น

```bash
# ตัวอย่าง
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### เอเจนต์

OpenCode รวมเอเจนต์ในตัวสองตัวที่คุณสามารถสลับได้ด้วยปุ่ม `Tab`

- **build** - เอเจนต์เริ่มต้น มีสิทธิ์เข้าถึงแบบเต็มสำหรับงานพัฒนา
- **plan** - เอเจนต์อ่านอย่างเดียวสำหรับการวิเคราะห์และการสำรวจโค้ด
  - ปฏิเสธการแก้ไขไฟล์โดยค่าเริ่มต้น
  - ขอสิทธิ์ก่อนเรียกใช้คำสั่ง bash
  - เหมาะสำหรับสำรวจโค้ดเบสที่ไม่คุ้นเคยหรือวางแผนการเปลี่ยนแปลง

นอกจากนี้ยังมีเอเจนต์ย่อย **general** สำหรับการค้นหาที่ซับซ้อนและงานหลายขั้นตอน
ใช้ภายในและสามารถเรียกใช้ได้โดยใช้ `@general` ในข้อความ

เรียนรู้เพิ่มเติมเกี่ยวกับ [เอเจนต์](https://opencode.ai/docs/agents)

### เอกสารประกอบ

สำหรับข้อมูลเพิ่มเติมเกี่ยวกับวิธีกำหนดค่า OpenCode [**ไปที่เอกสารของเรา**](https://opencode.ai/docs)

### การมีส่วนร่วม

หากคุณสนใจที่จะมีส่วนร่วมใน OpenCode โปรดอ่าน [เอกสารการมีส่วนร่วม](./CONTRIBUTING.md) ก่อนส่ง Pull Request

### การสร้างบน OpenCode

หากคุณทำงานในโปรเจกต์ที่เกี่ยวข้องกับ OpenCode และใช้ "opencode" เป็นส่วนหนึ่งของชื่อ เช่น "opencode-dashboard" หรือ "opencode-mobile" โปรดเพิ่มหมายเหตุใน README ของคุณเพื่อชี้แจงว่าไม่ได้สร้างโดยทีม OpenCode และไม่ได้เกี่ยวข้องกับเราในทางใด

---

**ร่วมชุมชนของเรา** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
