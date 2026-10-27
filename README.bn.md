<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">ওপেন সোর্স এআই কোডিং এজেন্ট।</p>
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

### স্বয়ংক্রিয় মডেল রাউটিং

OpenCode পুরো সেশন জুড়ে একটি মডেলে আটকে না থেকে প্রতিটি ধাপের জন্য আলাদা মডেল বেছে নিতে পারে: একটি লোকাল বা সাশ্রয়ী মডেল নিয়মিত কাজ সামলায়, আর শক্তিশালীতম মডেলটি সেই অংশগুলোর জন্য সংরক্ষিত থাকে যেগুলো সত্যিই তার দরকার। আপনি `routing.enabled` চালু না করা পর্যন্ত রাউটিং বন্ধ থাকে।

মডেল নির্বাচকের মধ্যে **Auto (Routing)** বেছে নিলে সেশনটি স্বয়ংক্রিয়ভাবে রাউট হবে। নির্দিষ্ট কোনো মডেল বেছে নিলে সেশনটি সেই মডেলে আটকে যায় এবং রাউটিং তাকে ছুঁয়ে দেখে না।

| স্তর    | ডিফল্ট                                | যার দায়িত্ব                                                                     |
| ------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Local   | আপনার `qwen` কনফিগারেশনের মডেলটি      | কোড লেখা, পরীক্ষা, রিফ্যাক্টরিং, এবং সেগুলো যাচাই করার বিল্ড ও শেল ধাপ          |
| Routine | সক্রিয় সবচেয়ে সস্তা DeepSeek Flash মডেল | পরিকল্পনা, বিশ্লেষণ, রিভিউ, ব্যাখ্যা এবং স্বাভাবিক ডিবাগিং            |
| Pro     | সক্রিয় সবচেয়ে শক্তিশালী DeepSeek মডেল | আর্কিটেকচার ও বড় রিফ্যাক্টরিং, কঠিন ডিবাগিং, নিরাপত্তা-সম্পর্কিত কাজ            |

- আপনার সর্বশেষ অনুরোধটি মূল শ্রেণিবিভাগ ঠিক করে, এরপর একই টার্নের ভেতরের প্রতিটি ধাপ সেই টার্ন ইতিমধ্যে যা করেছে তার ভিত্তিতে নতুন করে শ্রেণিবদ্ধ হয়: শুধু পড়া ও খোঁজার ধাপগুলো Routine স্তরেই থাকে। কোনো ধাপ ফাইল বদলে দেওয়া বা কমান্ড চালানোর পর থেকে বাকি টার্নটি Local স্তরেই চলতে থাকে। পরপর দুটি ধাপে টুল কল ব্যর্থ হলে তাকে কঠিন ডিবাগিং ধরা হয় এবং সেটি Pro স্তরে চলে যায়। `routing.step_routing: false` দিলে একটি টার্ন জুড়ে একটিমাত্র স্তর থাকে।
- একটি স্তর তখনই ব্যবহৃত হয় যখন সেই মডেলটি চালু ও এই মুহূর্তে সুস্থ থাকে, এবং কথোপকথনটি তার কনটেক্সট উইন্ডোর মধ্যেও ধরে।
- `routing.attempts` সংখ্যক ব্যর্থতার পর কাজটি পরবর্তী স্তরে উঠে যায় এবং ব্যর্থ মডেলটি কিছুক্ষণের জন্য এড়িয়ে চলা হয়। কোনো রান মাঝপথে থামিয়ে দেওয়া কখনও মডেলের ব্যর্থতা হিসেবে গণ্য হয় না।
- `routing.preference` খরচ ও মানের মধ্যে ভারসাম্য করে: `cost-first`, `balanced` (ডিফল্ট) বা `quality-first`। রাউটিং যখনই অন্য মডেল বেছে নেয়, সেশন তখন সেই মডেল, স্তর ও কারণ উল্লেখ করে ছোট একটি নোট দেখায় (`routing.diagnostics`)।

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // OpenAI-সামঞ্জস্য যেকোনো সার্ভার: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // ঐচ্ছিক। যা নির্দিষ্ট করা নেই, সেই ভূমিকাগুলো ক্যাটালগ থেকে পাওয়া যায়।
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### ওয়ার্কস্পেস সেটআপ উইজার্ড

অ্যাপ আপনার পুরো প্রজেক্ট ওয়ার্কস্পেস সাজিয়ে দিতে পারে: এটি আর্টিফ্যাক্ট তৈরি করে, সেগুলো যাচাই করে, প্রজেক্ট খোলে, এবং একটি সেশনে প্রথম কাজটি শুরু করে। প্রজেক্টের হোম থেকে **New project workspace** খুলুন (হেডারের গ্রিড আইকন), অথবা কমান্ড প্যালেট থেকে চালান। উইজার্ড যা জিজ্ঞেস করে: প্রজেক্টের বিবরণ ও যে ডিরেক্টরিতে তৈরি হবে সেই ডিরেক্টরি, আউটপুটের ভাষা, মডেল নির্বাচন (তিন মডেলের স্বয়ংক্রিয় রাউটিং, নাকি একটি আটকানো মডেল সাথে `cost-first`, `balanced`, `quality-first` পছন্দ), ঐচ্ছিকভাবে একটি লোকাল মডেল (বেস URL, মডেল আইডি, প্রোভাইডার আইডি, ঐচ্ছিক API কী, টাইমআউট, সর্বোচ্চ আউটপুট টোকেন) সঙ্গে সংযোগ পরীক্ষার, এবং খরচ-সচেতন অগ্রিম কম্পাকশন চালু করতে চান কিনা। এরপর এটি দৃশ্যমান ধাপগুলো পেরিয়ে প্রাথমিক কাজের সেশনটি খোলাই রেখে দেয়; ব্যর্থ ধাপ পুনরায় শুরু করা যায়, বাতিল করা রান আগে থেকে তৈরি হওয়া ফাইলগুলো রেখে দেয়।

ডিস্কে গোপন কিছুই লেখা হয় না: ঐচ্ছিক লোকাল API কীটি ক্রেডেনশিয়াল স্টোরে জমা থাকে, এবং প্রজেক্টের তৈরি `opencode.json` ফাইলে কেবল তার এনভায়রনমেন্ট ভেরিয়েবলের নামটাই আসতে পারে। সেই ফাইলটি ওই প্রজেক্টের পরবর্তী কাজেও একই রাউটিং ও কম্পাকশন সিদ্ধান্ত প্রয়োগ করে।

### স্বয়ংক্রিয় কম্পাকশন

লম্বা সেশনগুলো একটি স্থায়ী চেকপয়েন্টে সংক্ষেপিত হয়, যাতে কথোপকথনটি মডেলের উইন্ডোর মধ্যেই ধরে থাকে। দুটি স্বাধীন ট্রিগার এই একই ব্যবহার করে।

**কনটেক্সট সীমা কম্পাকশন** ডিফল্টভাবে চালু (`compaction.auto`): অনুরোধের আনুমানিক আকার মডেলের ছাদের উপরে চলে গেলে এটি চলে, সংরক্ষণ করে কথোপকথনের সবশেষ `compaction.keep.tokens` (ডিফল্ট 15,000) হুবহু, আর বাকিটা সংক্ষেপ করে। এটিই নিরাপত্তাজাল: নিচের অগ্রিম ট্রিগার এড়িয়ে গেলেও এটি সবসময় চলে।

**খরচ-সচেতন অগ্রিম কম্পাকশন** স্বেচ্ছায় চালু করতে হয় (`compaction.early.enabled`, ডিফল্টে বন্ধ) এবং সীমা দৃষ্টির কাছে আসার আগেই কাজ করে, যাতে সেশন পুরনো কনটেক্সট তখনই ছাঁটে যখন তা সস্তা। এটি তখনই চলে যখন পুরো কনটেক্সট অন্তত `min_tokens` (24,000) এবং সরানো অংশটি একাই অন্তত `min_benefit_tokens` (8,000) টোকেনের মূল্যবান, প্রতি সেশনে সর্বোচ্চ প্রতি `cooldown_seconds` (300) সেকেন্ডে একবার। `require_task_boundary` থাকলে এটি একটি স্বাভাবিক বিরতির অপেক্ষা করে; এর ডিফল্ট `true`, কিন্তু টুল কল করা একটি টার্ন কখনও এমন বিরতিতে পৌঁছায় না, তাই দীর্ঘ এজেন্ট টার্ন সত্যিই কম্প্যাক্ট হওয়ার উপায়ই হলো `false`। `local_summarize` থাকলে সারসংক্ষেপটি কনফিগার করা লোকাল মডেলে পাঠানো হয় এবং সেই মডেলের ব্যবহার ও খরচ রেকর্ড করা হয়।

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

একটি কম্পাকশন রানের নিজের সারসংক্ষেপের জন্য আউটপুট জায়গা লাগে; ছোট `limit.output` বিশিষ্ট লোকাল মডেল (যেমন 8,192) খুব বড় সেশনে তা ফুরিয়ে যেতে পারে এবং তখন ধাপটি `Compaction summary reached the output token limit` বলে ব্যর্থ হয় — এ দেখলে সেই সীমা বাড়ান, কিংবা `local_summarize` বন্ধ রাখুন।

### ইনস্টলেশন (Installation)

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Package managers
npm i -g @opencode/cli@latest      # or bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> ইনস্টল করার আগে ০.১.x এর চেয়ে পুরোনো ভার্সনগুলো মুছে ফেলুন।

### ডেস্কটপ অ্যাপ (BETA)

OpenCode ডেস্কটপ অ্যাপ্লিকেশন হিসেবেও উপলব্ধ। [opencode.ai/download](https://opencode.ai/download) থেকে ডাউনলোড করুন।

| প্ল্যাটফর্ম           | ডাউনলোড                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### ইনস্টলেশন ডিরেক্টরি (Installation Directory)

ইনস্টল স্ক্রিপ্টটি ইনস্টলেশন পাতের জন্য নিম্নলিখিত অগ্রাধিকার ক্রম মেনে চলে:

1. `$OPENCODE_INSTALL_DIR` - কাস্টম ইনস্টলেশন ডিরেক্টরি
2. `$XDG_BIN_DIR` - XDG বেস ডিরেক্টরি স্পেসিফিকেশন সমর্থিত পাথ
3. `$HOME/bin` - সাধারণ ব্যবহারকারী বাইনারি ডিরেক্টরি (যদি বিদ্যমান থাকে বা তৈরি করা যায়)
4. `$HOME/.opencode/bin` - ডিফল্ট ফলব্যাক

```bash
# উদাহরণ
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### এজেন্টস (Agents)

OpenCode এ দুটি বিল্ট-ইন এজেন্ট রয়েছে যা আপনি `Tab` কি(key) দিয়ে পরিবর্তন করতে পারবেন।

- **build** - ডিফল্ট, ডেভেলপমেন্টের কাজের জন্য সম্পূর্ণ অ্যাক্সেসযুক্ত এজেন্ট
- **plan** - বিশ্লেষণ এবং কোড এক্সপ্লোরেশনের জন্য রিড-ওনলি এজেন্ট
  - ডিফল্টভাবে ফাইল এডিট করতে দেয় না
  - ব্যাশ কমান্ড চালানোর আগে অনুমতি চায়
  - অপরিচিত কোডবেস এক্সপ্লোর করা বা পরিবর্তনের পরিকল্পনা করার জন্য আদর্শ

এছাড়াও জটিল অনুসন্ধান এবং মাল্টিস্টেপ টাস্কের জন্য একটি **general** সাবএজেন্ট অন্তর্ভুক্ত রয়েছে।
এটি অভ্যন্তরীণভাবে ব্যবহৃত হয় এবং মেসেজে `@general` লিখে ব্যবহার করা যেতে পারে।

এজেন্টদের সম্পর্কে আরও জানুন: [docs](https://opencode.ai/docs/agents)।

### ডকুমেন্টেশন (Documentation)

কিভাবে OpenCode কনফিগার করবেন সে সম্পর্কে আরও তথ্যের জন্য, [**আমাদের ডকস দেখুন**](https://opencode.ai/docs)।

### অবদান (Contributing)

আপনি যদি OpenCode এ অবদান রাখতে চান, অনুগ্রহ করে একটি পুল রিকোয়েস্ট সাবমিট করার আগে আমাদের [কন্ট্রিবিউটিং ডকস](./CONTRIBUTING.md) পড়ে নিন।

### OpenCode এর উপর বিল্ডিং (Building on OpenCode)

আপনি যদি এমন প্রজেক্টে কাজ করেন যা OpenCode এর সাথে সম্পর্কিত এবং প্রজেক্টের নামের অংশ হিসেবে "opencode" ব্যবহার করেন, উদাহরণস্বরূপ "opencode-dashboard" বা "opencode-mobile", তবে দয়া করে আপনার README তে একটি নোট যোগ করে স্পষ্ট করুন যে এই প্রজেক্টটি OpenCode দল দ্বারা তৈরি হয়নি এবং আমাদের সাথে এর কোনো সরাসরি সম্পর্ক নেই।

---

**আমাদের কমিউনিটিতে যুক্ত হোন** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
