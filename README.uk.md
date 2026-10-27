<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">AI-агент для програмування з відкритим кодом.</p>
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

### Автоматична маршрутизація моделей

OpenCode може обирати модель для кожного кроку, замість того щоб утримувати одну модель упродовж усієї сесії: локальна або дешова модель робить рутинну роботу, а найсильніша модель лишається резервом для тих частин, де вона справді потрібна. Маршрутизація вимкнена, доки ви не увімкнете `routing.enabled`.

Оберіть **Auto (Routing)** у меню вибору моделі, щоб сесія маршрутизувалася автоматично. Якщо обрати конкретну модель, сесія закріплюється за нею, і маршрутизація її не чіпає.

| Рівень  | Типово                               | Відповідає за                                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | модель із вашої конфігурації `qwen`  | реалізацію, тести, рефакторинг та кроки збірки й оболонки, які їх перевіряють    |
| Routine | найдешевша активна модель DeepSeek Flash | планування, аналіз, рев’ю, пояснення та звичайне налагоджування        |
| Pro     | найсильніша активна модель DeepSeek  | архітектура і великі рефакторинги, складне налагоджування, робота чутлива до безпеки |

- Останній запит задає базову класифікацію, а далі кожен крок у межах ходу перекласифіковується залежно від того, що хід уже зробив: кроки, які лише читають і шукають, лишаються на рівні Routine. Щойно крок змінив файли або виконав команду, решта ходу продовжує виконуватися на рівні Local. Два поспіль кроки з невдалими викликами інструментів рахуються як складне налагоджування і переходять на рівень Pro. Якщо `routing.step_routing: false`, увесь хід лишається на одному рівні.
- Рівень використовується лише тоді, коли модель увімкнена й зараз справна, а розмова ще вміщується в її контекстне вікно.
- Після `routing.attempts` невдач робота переходить на наступний рівень, а модель, що дає збої, пропускається на короткий час. Переривання виконання ніколи не рахується помилкою моделі.
- `routing.preference` розподіляє вартість і якість: `cost-first`, `balanced` (типово) або `quality-first`. Щоразу, коли модель змінюється, сесія показує коротку помітку з моделлю, рівнем і причиною (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Будь-який OpenAI-сумісний сервер: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Необов’язково. Не задані явно ролі беруться з каталогу.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Майстер налаштовування робочої області

Застосунок може налаштувати цілу робочу область проєкту за вас: він генерує артефакти, перевіряє їх, відкриває проєкт і запускає перше завдання в сесії. Відкрийте **New project workspace** на головній сторінці проєктів (значок сітки у шапці) або з палітри команд. Майстер питає опис проєкту та каталог призначення, мову виводу, вибір моделі (автоматична маршрутизація трьох моделей чи закріплена модель з перевагою `cost-first`, `balanced`, `quality-first`), за бажанням локальну модель (базовий URL, ID моделі, ID провайдера, необов’язковий ключ API, таймаут і максимальну кількість вихідних токенів) з перевіркою з’єднання, а також чи вмикати ранню компактацію з урахуванням вартості. Далі він проходить видимі етапи й лишає відкритою сесію з початковим завданням; невдалий етап можна продовжити, а скасоване виконання зберігає вже створені файли.

На диск не записується нічого секретного: необов’язковий локальний ключ API потрапляє до сховища облікових даних, і в створеному `opencode.json` проєкту може з’явитися лише назва його змінної середовища. Цей файл застосовує ті самі рішення щодо маршрутизації й компактації до подальшої роботи в проєкті.

### Автоматична компактація

Тривалі сесії зводяться до стійкої контрольної точки, щоб розмова й надалі вміщалася у вікно моделі. Два незалежні тригери користуються тим самим механізмом.

**Компактація за межею контексту** увімкнена типово (`compaction.auto`): вона спрацьовує, коли оцінений запит перетинає стелю моделі, дослівно зберігає останні `compaction.keep.tokens` (типово 15 000) і зводить решту.

**Рання компактація з урахуванням вартості** вмикається вручну (`compaction.early.enabled`) і діє, поки межа ще не видна: вона виконується лише якщо весь контекст становить щонайменше `min_tokens` (24 000) і прибрана частина сама по собі варта щонайменше `min_benefit_tokens` (8 000) токенів, не частіше одного разу на `cooldown_seconds` (300) на сесію. `require_task_boundary` чекає на природну перерву; типово це `true`, але один хід викликів інструментів ніколи не доходить до такої перерви, тому саме `false` дає змогу компактувати тривалі агентські ходи. `local_summarize` надсилає зводку налаштованій локальній моделі й записує її витрачання та вартість.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Виконанню компактації потрібен вихідний простір для власної зводки; локальна модель з малим `limit.output` може його вичерпати й завершитися помилкою `Compaction summary reached the output token limit` — підніміть цей ліміт або лишіть `local_summarize` вимкненим, коли бачите таке.

### Встановлення

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Менеджери пакетів
npm i -g @opencode/cli@latest      # або bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS і Linux (рекомендовано, завжди актуально)
brew install opencode              # macOS і Linux (офіційна формула Homebrew, оновлюється рідше)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Будь-яка ОС
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Перед встановленням видаліть версії старші за 0.1.x.

### Десктопний застосунок (BETA)

OpenCode також доступний як десктопний застосунок. Завантажуйте з [opencode.ai/download](https://opencode.ai/download).

| Платформа             | Завантаження                       |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` або AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Каталог встановлення

Скрипт встановлення дотримується такого порядку пріоритету для шляху встановлення:

1. `$OPENCODE_INSTALL_DIR` - Користувацький каталог встановлення
2. `$XDG_BIN_DIR` - Шлях, сумісний зі специфікацією XDG Base Directory
3. `$HOME/bin` - Стандартний каталог користувацьких бінарників (якщо існує або його можна створити)
4. `$HOME/.opencode/bin` - Резервний варіант за замовчуванням

```bash
# Приклади
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Агенти

OpenCode містить два вбудовані агенти, між якими можна перемикатися клавішею `Tab`.

- **build** - Агент за замовчуванням із повним доступом для завдань розробки
- **plan** - Агент лише для читання для аналізу та дослідження коду
  - За замовчуванням забороняє редагування файлів
  - Запитує дозвіл перед запуском bash-команд
  - Ідеально підходить для дослідження незнайомих кодових баз або планування змін

Також доступний допоміжний агент **general** для складного пошуку та багатокрокових завдань.
Він використовується всередині системи й може бути викликаний у повідомленнях через `@general`.

Дізнайтеся більше про [agents](https://opencode.ai/docs/agents).

### Документація

Щоб дізнатися більше про налаштування OpenCode, [**перейдіть до нашої документації**](https://opencode.ai/docs).

### Внесок

Якщо ви хочете зробити внесок в OpenCode, будь ласка, прочитайте нашу [документацію для контриб'юторів](./CONTRIBUTING.md) перед надсиланням pull request.

### Проєкти на базі OpenCode

Якщо ви працюєте над проєктом, пов'язаним з OpenCode, і використовуєте "opencode" у назві, наприклад "opencode-dashboard" або "opencode-mobile", додайте примітку до свого README.
Уточніть, що цей проєкт не створений командою OpenCode і жодним чином не афілійований із нами.

---

**Приєднуйтеся до нашої спільноти** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
