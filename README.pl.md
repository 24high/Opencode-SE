<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Otwartoźródłowy agent kodujący AI.</p>
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

### Automatyczne kierowanie modelami

OpenCode może wybierać model dla każdego kroku zamiast trzymać jeden model przez całą sesję: lokalny albo tani model wykonuje rutynową pracę, a najsilniejszy model jest zarezerwowany dla fragmentów, które naprawdę go potrzebują. Kierowanie jest wyłączone, dopóki nie włączysz `routing.enabled`.

Wybierz **Auto (Routing)** w selektorze modeli, aby sesja była kierowana automatycznie. Wybranie konkretnego modelu przypina do niego sesję i kierowanie jej nie zmienia.

| Poziom  | Domyślnie                            | Zajmuje się                                                                      |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | model z twojej konfiguracji `qwen`   | implementacją, testami, refaktoryzacją oraz krokami budowania i powłoki, które je sprawdzają |
| Routine | najtańszy aktywny model DeepSeek Flash | planowaniem, analizą, przeglądem, wyjaśnieniami i zwykłym debugowaniem    |
| Pro     | najsilniejszy aktywny model DeepSeek | architekturą i dużymi refaktoryzacjami, trudnym debugowaniem, pracą wrażliwą na bezpieczeństwo |

- Ostatnie zapytanie ustawia klasyfikację bazową, a następnie każdy krok w obrębie tury jest klasyfikowany ponownie na podstawie tego, co tura już zrobiła: kroki, które tylko czytają i szukają, pozostają na poziomie Routine. Gdy krok zmieni pliki albo wykona polecenie, reszta tury nadal wykonuje się na poziomie Local. Dwa kolejne kroki z nieudanymi wywołaniami narzędzi liczą się jako trudne debugowanie i trafiają na poziom Pro. Przy `routing.step_routing: false` tura pozostaje na jednym poziomie.
- Poziom jest używany tylko wtedy, gdy model jest włączony i obecnie zdrowy, a rozmowa nadal mieści się w jego oknie kontekstowym.
- Po `routing.attempts` niepowodzeniach praca trafia na wyższy poziom, a model, który się nie sprawdza, jest pomijany przez krótki czas karencji. Przerwanie wykonania nigdy nie liczy się jako błąd modelu.
- `routing.preference` rozkłada koszt na jakość: `cost-first`, `balanced` (domyślnie) albo `quality-first`. Przy każdej zmianie modelu sesja pokazuje krótką notatkę z modelem, poziomem i przyczyną (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Dowolny serwer zgodny z OpenAI: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Opcjonalne. Nieustawione role są pobierane z katalogu.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Kreator ustawiania obszaru roboczego

Aplikacja może przygotować cały obszar roboczy projektu: generuje artefakty, weryfikuje je, otwiera projekt i uruchamia pierwsze zadanie w sesji. Otwórz **Nowy obszar roboczy projektu** na ekranie startowym projektów (ikona siatki w nagłówku) albo z palety poleceń. Kreator pyta o opis projektu i katalog docelowy, język wyjścia, wybór modelu (automatyczne kierowanie trzema modelami albo przypięty model z preferencją `cost-first`, `balanced`, `quality-first`), opcjonalnie model lokalny (adres bazowy, ID modelu, ID providera, opcjonalny klucz API, limit czasu i maksymalna liczba tokenów wyjściowych) z testem połączenia oraz o to, czy włączyć wczesne kompresowanie liczące koszty. Następnie przechodzi przez widoczne etapy i zostawia otwartą sesję z pierwszym zadaniem; nieudany etap można wznowić, a przerwane wykonanie zachowuje już utworzone pliki.

Na dysk nie jest zapisywana żadna tajemnica: opcjonalny lokalny klucz API trafia do przechowalni poświadczeń, a w wygenerowanym pliku `opencode.json` projektu może pojawić się wyłącznie nazwa jego zmiennej środowiskowej. Ten plik stosuje te same decyzje o kierowaniu i kompresowaniu do dalszej pracy w projekcie.

### Automatyczne kompresowanie

Długie sesje są streszczane do trwałego punktu kontrolnego, żeby rozmowa nadal mieściła się w oknie modelu. Dwa niezależne wyzwalacze dzielą ten mechanizm.

**Kompresowanie granicy kontekstu** jest domyślnie włączone (`compaction.auto`): uruchamia się, gdy szacowane zapytanie przekroczy sufit modelu, zachowuje dosłownie ostatnie `compaction.keep.tokens` (domyślnie 15 000) i streszcza resztę.

**Wczesne kompresowanie liczące koszty** jest włączane ręcznie (`compaction.early.enabled`) i działa, zanim granica będzie widoczna: uruchamia się tylko wtedy, gdy cały kontekst ma co najmniej `min_tokens` (24 000), a usuwana część sama w sobie jest warta co najmniej `min_benefit_tokens` (8 000) tokenów, maksymalnie raz na `cooldown_seconds` (300) na sesję. `require_task_boundary` każe czekać na naturalną przerwę; domyślnie jest `true`, ale jedna tura wywołań narzędzi nigdy takiej przerwy nie osiąga, dlatego `false` sprawia, że długie agentowe tury w ogóle są kompresowane. `local_summarize` wysyła streszczenie do skonfigurowanego modelu lokalnego i zapisuje jego użycie oraz koszt.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Wykonanie kompresowania potrzebuje miejsca na wyjściu dla własnego streszczenia; model lokalny z małym `limit.output` może je wyczerpać i zakończyć się błędem `Compaction summary reached the output token limit` – podnieś ten limit albo zostaw `local_summarize` wyłączone, kiedy to zobaczysz.

### Instalacja

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Menedżery pakietów
npm i -g @opencode/cli@latest      # albo bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS i Linux (polecane, zawsze aktualne)
brew install opencode              # macOS i Linux (oficjalna formuła brew, rzadziej aktualizowana)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # dowolny system
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Przed instalacją usuń wersje starsze niż 0.1.x.

### Aplikacja desktopowa (BETA)

OpenCode jest także dostępny jako aplikacja desktopowa. Pobierz ją z [opencode.ai/download](https://opencode.ai/download).

| Platforma             | Pobieranie                         |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` lub AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Katalog instalacji

Skrypt instalacyjny stosuje następujący priorytet wyboru ścieżki instalacji:

1. `$OPENCODE_INSTALL_DIR` - Własny katalog instalacji
2. `$XDG_BIN_DIR` - Ścieżka zgodna ze specyfikacją XDG Base Directory
3. `$HOME/bin` - Standardowy katalog binarny użytkownika (jeśli istnieje lub można go utworzyć)
4. `$HOME/.opencode/bin` - Domyślny fallback

```bash
# Przykłady
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode zawiera dwóch wbudowanych agentów, między którymi możesz przełączać się klawiszem `Tab`.

- **build** - Domyślny agent z pełnym dostępem do pracy developerskiej
- **plan** - Agent tylko do odczytu do analizy i eksploracji kodu
  - Domyślnie odmawia edycji plików
  - Pyta o zgodę przed uruchomieniem komend bash
  - Idealny do poznawania nieznanych baz kodu lub planowania zmian

Dodatkowo jest subagent **general** do złożonych wyszukiwań i wieloetapowych zadań.
Jest używany wewnętrznie i można go wywołać w wiadomościach przez `@general`.

Dowiedz się więcej o [agents](https://opencode.ai/docs/agents).

### Dokumentacja

Więcej informacji o konfiguracji OpenCode znajdziesz w [**dokumentacji**](https://opencode.ai/docs).

### Współtworzenie

Jeśli chcesz współtworzyć OpenCode, przeczytaj [contributing docs](./CONTRIBUTING.md) przed wysłaniem pull requesta.

### Budowanie na OpenCode

Jeśli pracujesz nad projektem związanym z OpenCode i używasz "opencode" jako części nazwy (na przykład "opencode-dashboard" lub "opencode-mobile"), dodaj proszę notatkę do swojego README, aby wyjaśnić, że projekt nie jest tworzony przez zespół OpenCode i nie jest z nami w żaden sposób powiązany.

---

**Dołącz do naszej społeczności** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
