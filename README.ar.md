<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="شعار OpenCode">
    </picture>
  </a>
</p>
<p align="center">وكيل برمجة بالذكاء الاصطناعي مفتوح المصدر.</p>
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

### توجيه تلقائي للنماذج

يمكن لـ OpenCode أن يختار نموذجًا لكل خطوة بدلًا من الالتزام بنموذج واحد طوال الجلسة: نموذج محلي أو رخيص يقوم بالأعمال الروتينية، بينما يُحفظ أقوى نموذج للأجزاء التي تحتاجه فعلًا. يبقى التوجيه مطفأ حتى تفعّل `routing.enabled`.

اختر **Auto (Routing)** في مُنتقي النموذج لتُوجَّه الجلسة تلقائيًا. أما إذا اخترت نموذجًا محددًا فتُربط الجلسة به ولا يتدخل التوجيه.

| المستوى | الافتراضي                             | يتولى                                                                             |
| ------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| Local   | النموذج في إعدادات `qwen` الخاصة بك   | التنفيذ والاختبارات وإعادة الهيكلة، وخطوات البناء والصدفة التي تتحقق منها          |
| Routine | أرخص نموذج DeepSeek Flash مُفعَّل     | التخطيط والتحليل والمراجعة والتفسيرات وتصحيح الأخطاء الاعتيادي                     |
| Pro     | أقوى نموذج DeepSeek مُفعَّل           | البنية الكبيرة وإعادة الهيكلة الواسعة وتصحيح الأخطاء الصعب والأعمال الحساسة أمنيا  |

- يحدّد طلبك الأخير التصنيف الأساسي، ثم تُصنَّف كل خطوة داخل الدورة من جديد بناءً على ما فعلته الدورة بالفعل: الخطوات التي تقرأ وتبحث فقط تبقى في مستوى Routine. وبمجرد أن تُعدّل خطوة الملفات أو تُنفّذ أمرًا، تستكمل بقية الدورة التنفيذ في مستوى Local. خطوتان متتاليتان فشلت فيهما استدعاءات الأدوات تُعامل كتصحيح أصيب بالصعوبة فتنتقل إلى مستوى Pro. وعند ضبط `routing.step_routing: false` تبقى الدورة كلها على مستوى واحد.
- لا يُستخدم أي مستوى إلا إذا كان نموذجه مُفعَّلًا وسليمًا في تلك اللحظة، وما زالت المحادثة تتسع داخل نافذة سياقه.
- بعد `routing.attempts` من الإخفاقات ينتقل العمل إلى المستوى التالي، ويتجاوز النظام النموذج الفاشل لفترة تبريد قصيرة. لا يُحتسب قطع التنفيذ أبدًا فشلًا في النموذج.
- تُوازن `routing.preference` بين الكلفة والجودة: `cost-first` أو `balanced` (الافتراضي) أو `quality-first`. كلما اختار التوجيه نموذجًا مختلفًا، تعرض الجلسة ملاحظة قصيرة تذكر النموذج ومستواه وسبب اختياره (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // أي خادم متوافق مع OpenAI: llama.cpp وOllama وvLLM وLM Studio وغيرها
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
    // اختياري. الأدوار غير المحددة تُستكشف من الكتالوج.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### مساعد إعداد مساحة العمل

يمكن للتطبيق أن يُهيّئ مساحة عمل مشروع كاملة نيابة عنك: يُنشئ المخرجات ويتحقق منها ويفتح المشروع ويبدأ المهمة الأولى في جلسة. افتح **New project workspace** من الصفحة الرئيسية للمشاريع (أيقونة الشبكة في الشريط العلوي) أو من لوحة الأوامر. يسأل المساعد عن وصف المشروع والمجلد الذي سيُنشأ فيه، ولغة المخرجات، واختيار النموذج (توجيه تلقائي بثلاثة نماذج، أو نموذج مثبّت مع تفضيل `cost-first` أو `balanced` أو `quality-first`)، ونموذج محلي اختياري (الرابط الأساسي ومعرّف النموذج ومعرّف المزوّد ومفتاح API اختياري والمهلة وحد أقصى لرموز الإخراج) مع اختبار للاتصال، ثم إن كان ينبغي تفعيل الضغط المبكر المراعي للتكلفة. بعدها يمر بمراحل ظاهرة ويُبقي جلسة المهمة الأولى مفتوحة؛ ويمكن استئناف أي مرحلة فشلت، أما التنفيذ الملغى فيُبقي الملفات التي أُنشئت فعلًا.

لا يُكتب أي سر على القرص: مفتاح API المحلي الاختياري يذهب إلى مخزن بيانات الاعتماد، ولا يظهر في ملف `opencode.json` الخاص بالمشروع سوى اسم متغير البيئة الخاص به. ويطبّق ذلك الملف قرارات التوجيه والضغط نفسها على الأعمال اللاحقة في المشروع.

### الضغط التلقائي

تُلخَّص الجلسات الطويلة في نقطة تحقّق دائمة كي تظل المحادثة متسعة داخل نافذة النموذج. محفّزان مستقلان يتقاسمان هذه الآلية.

**الضغط عند حدّ السياق** مفعّل افتراضيًا (`compaction.auto`): يعمل عندما يتجاوز الطلب المُقدَّر سقف النموذج، ويحتفظ حرفيًا بأحدث `compaction.keep.tokens` (15,000 افتراضيًا) من المحادثة ويلخّص الباقي. هذه هي شبكة الأمان: تعمل دائمًا حتى إذا تجاوز المُحفّز المبكر أدناه.

**الضغط المبكر المراعي للتكلفة** يحتاج إلى تفعيل صريح (`compaction.early.enabled`، مطفأ افتراضيًا) ويتصرّف قبل أن يلوح الحدّ: لا يعمل إلا إذا كان السياق كله عند `min_tokens` (24,000) على الأقل، والجزء القابل للإزالة وحده يساوي `min_benefit_tokens` (8,000) رمزًا على الأقل، بحد أقصى مرة كل `cooldown_seconds` (300) ثانية لكل جلسة. يجعل `require_task_boundary` الانتظار عند فاصل طبيعي؛ قيمته الافتراضية `true`، لكن دورة واحدة من استدعاءات الأدوات لا تصل إلى فاصل كهذا أبدًا، لذلك فإن `false` هو ما يجعل دورات الوكيل الطويلة تُضغط فعلًا. يرسل `local_summarize` التلخيص نفسه إلى النموذج المحلي المضبوط ويسجّل استخدامه وتكلفته.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

يحتاج تنفيذ الضغط إلى مساحة إخراج لملخّصه نفسه؛ فقد ينفد ذلك مع نموذج محلي بـ `limit.output` صغير (8,192 مثلًا) على جلسة كبيرة جدًا، وتفشل الخطوة عندئذ بـ `Compaction summary reached the output token limit` — ارفع ذلك الحدّ أو اترك `local_summarize` مطفأًا عند رؤية هذا الخطأ.

### التثبيت

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# مديري الحزم
npm i -g @opencode/cli@latest      # او bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS و Linux (موصى به، دائما محدث)
brew install opencode              # macOS و Linux (صيغة brew الرسمية، تحديث اقل)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # اي نظام
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> احذف الاصدارات الاقدم من 0.1.x قبل التثبيت.

### تطبيق سطح المكتب (BETA)

يتوفر OpenCode ايضا كتطبيق سطح مكتب. قم بالتنزيل من [opencode.ai/download](https://opencode.ai/download).

| المنصة                | التنزيل                            |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb` او `.rpm` او AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### مجلد التثبيت

يحترم سكربت التثبيت ترتيب الاولوية التالي لمسار التثبيت:

1. `$OPENCODE_INSTALL_DIR` - مجلد تثبيت مخصص
2. `$XDG_BIN_DIR` - مسار متوافق مع مواصفات XDG Base Directory
3. `$HOME/bin` - مجلد الثنائيات القياسي للمستخدم (ان وجد او امكن انشاؤه)
4. `$HOME/.opencode/bin` - المسار الافتراضي الاحتياطي

```bash
# امثلة
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

يتضمن OpenCode وكيليْن (Agents) مدمجين يمكنك التبديل بينهما باستخدام زر `Tab`.

- **build** - الافتراضي، وكيل بصلاحيات كاملة لاعمال التطوير
- **plan** - وكيل للقراءة فقط للتحليل واستكشاف الكود
  - يرفض تعديل الملفات افتراضيا
  - يطلب الاذن قبل تشغيل اوامر bash
  - مثالي لاستكشاف قواعد كود غير مألوفة او لتخطيط التغييرات

بالاضافة الى ذلك يوجد وكيل فرعي **general** للبحث المعقد والمهام متعددة الخطوات.
يستخدم داخليا ويمكن استدعاؤه بكتابة `@general` في الرسائل.

تعرف على المزيد حول [agents](https://opencode.ai/docs/agents).

### التوثيق

لمزيد من المعلومات حول كيفية ضبط OpenCode، [**راجع التوثيق**](https://opencode.ai/docs).

### المساهمة

اذا كنت مهتما بالمساهمة في OpenCode، يرجى قراءة [contributing docs](./CONTRIBUTING.md) قبل ارسال pull request.

### البناء فوق OpenCode

اذا كنت تعمل على مشروع مرتبط بـ OpenCode ويستخدم "opencode" كجزء من اسمه (مثل "opencode-dashboard" او "opencode-mobile")، يرجى اضافة ملاحظة في README توضح انه ليس مبنيا بواسطة فريق OpenCode ولا يرتبط بنا بأي شكل.

---

**انضم الى مجتمعنا** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
