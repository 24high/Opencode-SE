<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo OpenCode">
    </picture>
  </a>
</p>
<p align="center">L’agente di coding AI open source.</p>
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

### Instradamento automatico dei modelli

OpenCode può scegliere un modello per ogni passo invece di tenere lo stesso modello per tutta la sessione: un modello locale o economico svolge il lavoro ordinario e il modello più potente resta riservato alle parti che ne hanno davvero bisogno. L'instradamento rimane spento finché non attivi `routing.enabled`.

Scegli **Auto (Routing)** nel selettore dei modelli per instradare una sessione in modo automatico. Se scegli un modello specifico, la sessione resta vincolata a quel modello e l'instradamento non la tocca.

| Livello | Predefinito                          | Si occupa di                                                                    |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | il modello nella tua configurazione `qwen` | implementazione, test, refactoring e i passi di build e shell che li verificano |
| Routine | il modello DeepSeek Flash attivo più economico | pianificazione, analisi, revisione, spiegazioni e debugging ordinario |
| Pro     | il modello DeepSeek attivo più potente | architettura e grandi refactoring, debugging difficile, lavoro sensibile alla sicurezza |

- La tua ultima richiesta stabilisce la classificazione di base, poi ogni passo del turno viene riclassificato in base a ciò che il turno ha già fatto: i passi che si limitano a leggere e cercare restano sul livello Routine. Non appena un passo ha modificato file o eseguito un comando, il resto del turno continua a essere eseguito sul livello Local. Due passi consecutivi con chiamate a strumenti fallite contano come debugging difficile e passano al livello Pro. Con `routing.step_routing: false` il turno mantiene un solo livello.
- Un livello viene usato solo se il suo modello è abilitato e attualmente sano, e se la conversazione sta ancora nella sua finestra di contesto.
- Dopo `routing.attempts` fallimenti il lavoro passa al livello successivo e il modello che fallisce viene saltato per un breve periodo di raffreddamento. Interrompere un'esecuzione non conta mai come fallimento del modello.
- `routing.preference` bilancia costo e qualità: `cost-first`, `balanced` (predefinito) o `quality-first`. Ogni cambio di modello mostra una nota con il modello, il livello e il motivo (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Qualsiasi server compatibile OpenAI: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Facoltativo. I ruoli non impostati vengono individuati dal catalogo.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Procedura guidata di configurazione dell'area di lavoro

L'app può preparare un'intera area di lavoro per il progetto: genera gli artefatti, li verifica, apre il progetto e avvia la prima attività in una sessione. Apri **Nuova area di lavoro del progetto** dalla home dei progetti (l'icona a griglia nell'intestazione) o dalla palette dei comandi. La procedura guidata chiede la descrizione del progetto e la directory di destinazione, una lingua di output, la selezione del modello (instradamento automatico a tre modelli oppure un modello fisso con preferenza `cost-first`, `balanced`, `quality-first`), facoltativamente un modello locale (URL di base, ID modello, ID provider, chiave API facoltativa, timeout, token di output massimi) con un test di connessione, e se abilitare il compattamento anticipato attento ai costi. Successivamente attraversa fasi visibili e lascia aperta la sessione con l'attività iniziale; una fase fallita può essere ripresa e un'esecuzione annullata conserva i file già creati.

Sul disco non viene scritto nulla di riservato: la chiave API locale facoltativa finisce nell'archivio delle credenziali e nel file `opencode.json` del progetto può comparire solo il nome della sua variabile d'ambiente. Quel file applica le stesse decisioni di instradamento e compattamento al lavoro successivo nel progetto.

### Compattamento automatico

Le sessioni lunghe vengono riassunte in un punto di controllo persistente, così la conversazione continua a stare nella finestra del modello. Due meccanismi indipendenti condividono questa macchina.

**Il compattamento per limite di contesto** è attivo per impostazione predefinita (`compaction.auto`): viene eseguito quando la richiesta stimata supera il tetto del modello, conserva alla lettera gli ultimi `compaction.keep.tokens` (15.000 predefiniti) e riassume il resto.

**Il compattamento anticipato attento ai costi** è opzionale (`compaction.early.enabled`) e agisce prima che il limite sia in vista: viene eseguito solo se l'intero contesto raggiunge almeno `min_tokens` (24.000) e la parte rimuovibile vale almeno `min_benefit_tokens` (8.000) token, al più una volta ogni `cooldown_seconds` (300) per sessione. `require_task_boundary` lo fa attendere una pausa naturale; il valore predefinito è `true`, ma un turno di chiamate a strumenti non raggiunge mai una pausa del genere, quindi `false` è ciò che rende possibile compattare i lunghi turni agentici. `local_summarize` invia il riassunto al modello locale configurato e registra il suo utilizzo e il suo costo.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Un'esecuzione di compattamento ha bisogno di spazio di output per il proprio riassunto; un modello locale con un `limit.output` piccolo può fallire con `Compaction summary reached the output token limit`. In quel caso aumenta quel limite o lascia `local_summarize` disattivato.

### Installazione

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Package manager
npm i -g @opencode/cli@latest      # oppure bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS e Linux (consigliato, sempre aggiornato)
brew install opencode              # macOS e Linux (formula brew ufficiale, aggiornata meno spesso)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Qualsiasi OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Rimuovi le versioni precedenti alla 0.1.x prima di installare.

### App Desktop (BETA)

OpenCode è disponibile anche come applicazione desktop. Puoi scaricarla da [opencode.ai/download](https://opencode.ai/download).

| Piattaforma           | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, oppure AppImage    |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Directory di installazione

Lo script di installazione rispetta il seguente ordine di priorità per il percorso di installazione:

1. `$OPENCODE_INSTALL_DIR` – Directory di installazione personalizzata
2. `$XDG_BIN_DIR` – Percorso conforme alla XDG Base Directory Specification
3. `$HOME/bin` – Directory binaria standard dell’utente (se esiste o può essere creata)
4. `$HOME/.opencode/bin` – Fallback predefinito

```bash
# Esempi
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agenti

OpenCode include due agenti integrati tra cui puoi passare usando il tasto `Tab`.

- **build** – Predefinito, agente con accesso completo per il lavoro di sviluppo
- **plan** – Agente in sola lettura per analisi ed esplorazione del codice
  - Nega le modifiche ai file per impostazione predefinita
  - Chiede il permesso prima di eseguire comandi bash
  - Ideale per esplorare codebase sconosciute o pianificare modifiche

È inoltre incluso un sotto-agente **general** per ricerche complesse e attività multi-step.
Viene utilizzato internamente e può essere invocato usando `@general` nei messaggi.

Scopri di più sugli [agenti](https://opencode.ai/docs/agents).

### Documentazione

Per maggiori informazioni su come configurare OpenCode, [**consulta la nostra documentazione**](https://opencode.ai/docs).

### Contribuire

Se sei interessato a contribuire a OpenCode, leggi la nostra [guida alla contribuzione](./CONTRIBUTING.md) prima di inviare una pull request.

### Costruire su OpenCode

Se stai lavorando a un progetto correlato a OpenCode e che utilizza “opencode” come parte del nome (ad esempio “opencode-dashboard” o “opencode-mobile”), aggiungi una nota nel tuo README per chiarire che non è sviluppato dal team OpenCode e che non è affiliato in alcun modo con noi.

---

**Unisciti alla nostra community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
