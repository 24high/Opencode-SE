<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Der Open-Source KI-Coding-Agent.</p>
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

### Automatische Modell-Routing

OpenCode kann für jeden Schritt ein eigenes Modell wählen, statt ein Modell für die ganze Session zu halten: Ein lokales oder günstiges Modell macht die Routinearbeit, das stärkste Modell bleibt den Teilen vorbehalten, die es wirklich brauchen. Routing ist so lange aus, bis du `routing.enabled` einschaltest.

Wähle im Modellauswahlmenü **Auto (Routing)**, um eine Session automatisch zu routen. Wer ein bestimmtes Modell auswählt, legt die Session darauf fest, und Routing lässt sie in Ruhe.

| Ebene   | Standard                             | Zuständig für                                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | das Modell aus deiner `qwen`-Konfiguration | Implementierung, Tests, Refactorings sowie die Build- und Shell-Schritte, die sie prüfen |
| Routine | günstigstes aktives DeepSeek-Flash-Modell | Planung, Analyse, Review, Erklärungen, gewöhnliches Debugging            |
| Pro     | stärkstes aktives DeepSeek-Modell    | Architektur und große Refactorings, schwieriges Debugging, sicherheitsrelevante Arbeit |

- Deine letzte Anfrage setzt die Grundklassifizierung, danach wird jeder Schritt im Turn anhand dessen neu eingeteilt, was der Turn bereits getan hat: Schritte, die nur lesen und suchen, bleiben auf der Routine-Ebene. Sobald ein Schritt Dateien geändert oder einen Befehl ausgeführt hat, führt der Rest des Turns die Arbeit auf der Local-Ebene fort. Zwei aufeinanderfolgende Schritte mit fehlgeschlagenen Tool-Aufrufen zählen als schwieriges Debugging und gehen an die Pro-Ebene. Mit `routing.step_routing: false` bleibt ein Turn bei einer Ebene.
- Eine Ebene wird nur genutzt, wenn ihr Modell aktiviert und gesund ist und die Konversation noch in sein Kontextfenster passt.
- Nach `routing.attempts` Fehlschlägen eskaliert die Arbeit auf die nächste Ebene, und das fehlerhafte Modell wird für eine kurze Abklingzeit übersprungen. Ein unterbrochener Lauf zählt nie als Modellfehler.
- `routing.preference` tauscht Kosten gegen Qualität: `cost-first`, `balanced` (Standard) oder `quality-first`. Bei jedem Modellwechsel zeigt die Session eine kurze Notiz mit Modell, Ebene und Grund (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Jeder OpenAI-kompatible Server: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Optional. Fehlende Rollen werden aus dem Katalog geholt.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Workspace-Einrichtungsassistent

Die App richtet ein komplettes Projekt-Workspace für dich ein: Sie erzeugt die Workspace-Artefakte, prüft sie, öffnet das Projekt und startet die erste Aufgabe in einer Session. Öffne **Neues Projekt-Workspace** auf der Projektübersicht (das Raster-Symbol in der Kopfzeile) oder über die Befehlspalette. Der Assistent fragt nach Projektbeschreibung und Zielverzeichnis, einer Ausgabesprache, der Modellauswahl (automatisches Drei-Modell-Routing oder ein festgelegtes Modell mit Präferenz `cost-first`, `balanced`, `quality-first`), optional einem lokalen Modell (Base-URL, Modell-ID, Provider-ID, optional API-Key, Timeout, maximale Ausgabe-Tokens) mit Verbindungstest, und ob die frühe kostenbewusste Kompaktierung aktiv sein soll. Danach arbeitet er sichtbare Stufen ab und lässt die fertige Session mit der ersten Aufgabe offen; eine fehlgeschlagene Stufe kann fortgesetzt werden, ein abgebrochener Lauf behält die bereits erzeugten Dateien.

Es wird nichts Geheimes auf die Platte geschrieben: Ein optionaler lokaler API-Key kommt in den Credential-Speicher, und in der erzeugten projektbezogenen `opencode.json` darf nur sein Umgebungsvariablenname stehen. Diese Datei übernimmt dieselben Routing- und Kompaktierungsentscheidungen für spätere Arbeit in dem Projekt.

### Automatische Kompaktierung

Lange Sessions werden zu einem dauerhaften Prüfpunkt zusammengefasst, damit die Konversation weiter in das Fenster des Modells passt. Zwei unabhängige Auslöser nutzen dieselbe Mechanik.

**Kompaktierung durch Kontextgrenze** ist standardmäßig an (`compaction.auto`): Sie läuft, wenn die geschätzte Anfrage die Obergrenze des Modells überschreitet, behält die zuletzt genutzten `compaction.keep.tokens` (Standard 15.000) unverändert und fasst den Rest zusammen.

**Frühe kostenbewusste Kompaktierung** ist opt-in (`compaction.early.enabled`) und greift, bevor die Grenze in Sicht kommt: Sie läuft nur, wenn der gesamte Kontext mindestens `min_tokens` (24.000) ergibt und der entfallbare Teil mindestens `min_benefit_tokens` (8.000) Tokens bringt, höchstens alle `cooldown_seconds` (300) pro Session. `require_task_boundary` lässt sie auf eine natürliche Pause warten; das ist standardmäßig `true`, aber ein einzelner Tool-Calling-Turn erreicht nie eine solche Pause — `false` ist deshalb die Einstellung, mit der lange agentische Turns überhaupt kompaktiert werden. `local_summarize` schickt die Zusammenfassung an das konfigurierte lokale Modell und erfasst deren Nutzung und Kosten.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Ein Kompaktierungslauf braucht Ausgaberaum für die eigene Zusammenfassung. Ein lokales Modell mit kleinem `limit.output` kann deshalb mit `Compaction summary reached the output token limit` fehlschlagen — dann diesen Wert erhöhen oder `local_summarize` ausschalten.

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Paketmanager
npm i -g @opencode/cli@latest      # oder bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS und Linux (empfohlen, immer aktuell)
brew install opencode              # macOS und Linux (offizielle Brew-Formula, seltener aktualisiert)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # jedes Betriebssystem
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Entferne Versionen älter als 0.1.x vor der Installation.

### Desktop-App (BETA)

OpenCode ist auch als Desktop-Anwendung verfügbar. Lade sie von [opencode.ai/download](https://opencode.ai/download) herunter.

| Plattform             | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` oder AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installationsverzeichnis

Das Installationsskript beachtet die folgende Prioritätsreihenfolge für den Installationspfad:

1. `$OPENCODE_INSTALL_DIR` - Benutzerdefiniertes Installationsverzeichnis
2. `$XDG_BIN_DIR` - XDG Base Directory Specification-konformer Pfad
3. `$HOME/bin` - Standard-Binärverzeichnis des Users (falls vorhanden oder erstellbar)
4. `$HOME/.opencode/bin` - Standard-Fallback

```bash
# Beispiele
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode enthält zwei eingebaute Agents, zwischen denen du mit der `Tab`-Taste wechseln kannst.

- **build** - Standard-Agent mit vollem Zugriff für Entwicklungsarbeit
- **plan** - Nur-Lese-Agent für Analyse und Code-Exploration
  - Verweigert Datei-Edits standardmäßig
  - Fragt vor dem Ausführen von bash-Befehlen nach
  - Ideal zum Erkunden unbekannter Codebases oder zum Planen von Änderungen

Außerdem ist ein **general**-Subagent für komplexe Suchen und mehrstufige Aufgaben enthalten.
Dieser wird intern genutzt und kann in Nachrichten mit `@general` aufgerufen werden.

Mehr dazu unter [Agents](https://opencode.ai/docs/agents).

### Dokumentation

Mehr Infos zur Konfiguration von OpenCode findest du in unseren [**Docs**](https://opencode.ai/docs).

### Beitragen

Wenn du zu OpenCode beitragen möchtest, lies bitte unsere [Contributing Docs](./CONTRIBUTING.md), bevor du einen Pull Request einreichst.

### Auf OpenCode aufbauen

Wenn du an einem Projekt arbeitest, das mit OpenCode zusammenhängt und "opencode" als Teil seines Namens verwendet (z.B. "opencode-dashboard" oder "opencode-mobile"), füge bitte einen Hinweis in deine README ein, dass es nicht vom OpenCode-Team gebaut wird und nicht in irgendeiner Weise mit uns verbunden ist.

---

**Tritt unserer Community bei** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
