<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Открытый AI-агент для программирования.</p>
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

### Автоматическая маршрутизация моделей

OpenCode может выбирать модель для каждого шага, а не удерживать одну модель всю сессию: локальная или дешёвая модель делает рутинную работу, а самая сильная модель остаётся запасом для тех частей, где она действительно нужна. Маршрутизация выключена, пока вы не включите `routing.enabled`.

Выберите **Auto (Routing)** в меню выбора модели, чтобы сессия маршрутизировалась автоматически. Если выбрать конкретную модель, сессия закрепляется за ней, и маршрутизация её не трогает.

| Уровень | По умолчанию                         | Занимается                                                                      |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | модель из вашей конфигурации `qwen`  | реализацией, тестами, рефакторингом и шагами сборки и оболочки, которые их проверяют |
| Routine | самая дешёвая активная модель DeepSeek Flash | планирование, анализ, ревью, объяснения и обычная отладка           |
| Pro     | самая сильная активная модель DeepSeek | архитектура и крупные рефакторинги, сложная отладка, чувствительная к безопасности работа |

- Последний запрос задаёт базовую классификацию, а затем каждый шаг внутри хода переопределяется исходя из того, что ход уже сделал: шаги, которые только читают и ищут, остаются на уровне Routine. Как только шаг изменил файлы или выполнил команду, остальная часть хода продолжает выполняться на уровне Local. Два подряд шага с неудавшимися вызовами инструментов считаются сложной отладкой и уходят на уровень Pro. При `routing.step_routing: false` весь ход остаётся на одном уровне.
- Уровень используется только если модель включена и сейчас здорова, а разговор ещё помещается в её контекстное окно.
- После `routing.attempts` неудач работа переходит на следующий уровень, а сбоящая модель пропускается короткое время. Прерывание выполнения никогда не считается ошибкой модели.
- `routing.preference` распределяет стоимость и качество: `cost-first`, `balanced` (по умолчанию) или `quality-first`. При каждой смене модели сессия показывает короткую пометку с моделью, уровнем и причиной (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Любой OpenAI-совместимый сервер: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Необязательно. Не заданные явно роли берутся из каталога.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Мастер настройки рабочей области

Приложение может настроить целиком рабочую область проекта: оно генерирует артефакты, проверяет их, открывает проект и запускает первую задачу в сессии. Откройте **New project workspace** на главной странице проектов (значок сетки в шапке) или из палитры команд. Мастер спрашивает описание проекта и каталог назначения, язык вывода, выбор модели (автоматическая маршрутизация трёх моделей либо закреплённая модель с предпочтением `cost-first`, `balanced`, `quality-first`), при желании локальную модель (базовый URL, ID модели, ID провайдера, необязательный ключ API, таймаут и максимальное число выходных токенов) с проверкой соединения, а также нужно ли включить раннюю компактацию с учётом стоимости. Затем он проходит видимые этапы и оставляет открытой сессию с исходной задачей; неудавшийся этап можно продолжить, а отменённое выполнение сохраняет уже созданные файлы.

На диск не записывается ничего секретного: необязательный локальный ключ API попадает в хранилище учётных данных, и в созданном `opencode.json` проекта может появиться только имя его переменной окружения. Этот файл применяет те же решения о маршрутизации и компактации к дальнейшей работе в проекте.

### Автоматическая компактация

Длинные сессии сводятся к устойчивой контрольной точке, чтобы разговор продолжал помещаться в окно модели. Два независимых триггера используют один и тот же механизм.

**Компактация по границе контекста** включена по умолчанию (`compaction.auto`): она срабатывает, когда оценённый запрос пересекает потолок модели, дословно сохраняет последние `compaction.keep.tokens` (по умолчанию 15 000) и сводит остальное.

**Ранняя компактация с учётом стоимости** включается вручную (`compaction.early.enabled`) и действует, пока граница ещё не видна: она выполняется только если весь контекст составляет не менее `min_tokens` (24 000) и удаляемая часть сама по себе стоит не менее `min_benefit_tokens` (8 000) токенов, не чаще одного раза на `cooldown_seconds` (300) на сессию. `require_task_boundary` ждёт естественной паузы; по умолчанию это `true`, но один ход вызовов инструментов никогда не доходит до такой паузы, поэтому именно `false` позволяет компактировать длинные агентские ходы. `local_summarize` отправляет сводку настроенной локальной модели и записывает её расход и стоимость.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Выполнению компактации нужно выходное пространство для собственной сводки; локальная модель с маленьким `limit.output` может его исчерпать и упасть с `Compaction summary reached the output token limit` — поднимите этот лимит или оставьте `local_summarize` выключенным, когда видите такое.

### Установка

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Менеджеры пакетов
npm i -g @opencode/cli@latest      # или bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS и Linux (рекомендуем, всегда актуально)
brew install opencode              # macOS и Linux (официальная формула brew, обновляется реже)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # любая ОС
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Перед установкой удалите версии старше 0.1.x.

### Десктопное приложение (BETA)

OpenCode также доступен как десктопное приложение. Скачайте его с [opencode.ai/download](https://opencode.ai/download).

| Платформа             | Загрузка                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` или AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Каталог установки

Скрипт установки выбирает путь установки в следующем порядке приоритета:

1. `$OPENCODE_INSTALL_DIR` - Пользовательский каталог установки
2. `$XDG_BIN_DIR` - Путь, совместимый со спецификацией XDG Base Directory
3. `$HOME/bin` - Стандартный каталог пользовательских бинарников (если существует или можно создать)
4. `$HOME/.opencode/bin` - Fallback по умолчанию

```bash
# Примеры
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

В OpenCode есть два встроенных агента, между которыми можно переключаться клавишей `Tab`.

- **build** - По умолчанию, агент с полным доступом для разработки
- **plan** - Агент только для чтения для анализа и изучения кода
  - По умолчанию запрещает редактирование файлов
  - Запрашивает разрешение перед выполнением bash-команд
  - Идеален для изучения незнакомых кодовых баз или планирования изменений

Также включен сабагент **general** для сложных поисков и многошаговых задач.
Он используется внутренне и может быть вызван в сообщениях через `@general`.

Подробнее об [agents](https://opencode.ai/docs/agents).

### Документация

Больше информации о том, как настроить OpenCode: [**наши docs**](https://opencode.ai/docs).

### Вклад

Если вы хотите внести вклад в OpenCode, прочитайте [contributing docs](./CONTRIBUTING.md) перед тем, как отправлять pull request.

### Разработка на базе OpenCode

Если вы делаете проект, связанный с OpenCode, и используете "opencode" как часть имени (например, "opencode-dashboard" или "opencode-mobile"), добавьте примечание в README, чтобы уточнить, что проект не создан командой OpenCode и не аффилирован с нами.

---

**Присоединяйтесь к нашему сообществу** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
