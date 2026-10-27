<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">Den open source AI-kodeagent.</p>
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

### Automatisk modelrouting

OpenCode kan vælge en model til hvert trin i stedet for at beholde én model hele sessionen: en lokal eller billig model laver det rutineprægede arbejde, og den stærkeste model er reserveret til de dele, der virkelig har brug for den. Routing er slukket, indtil du aktiverer `routing.enabled`.

Vælg **Auto (Routing)** i modelvælgeren for at route en session automatisk. Vælger du en bestemt model, låses sessionen til den, og routing rører den ikke.

| Niveau  | Standard                             | Dækker over                                                                      |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | modellen i din `qwen`-konfiguration  | implementering, tests, refactoring samt de build- og shell-trin, der verificerer dem |
| Routine | den billigste aktive DeepSeek Flash-model | planlægning, analyse, gennemgang, forklaringer og almindelig fejlfinding |
| Pro     | den stærkeste aktive DeepSeek-model  | arkitektur og store refactoring, svær fejlfinding, sikkerhedskritisk arbejde |

- Din seneste forespørgsel sætter grundklassificeringen, og hvert trin i turen bliver klassificeret igen ud fra, hvad turen allerede har gjort: trin, der kun læser og søger, bliver på Routine-niveauet. Når ét trin har ændret filer eller kørt en kommando, fortsætter resten af turen på Local-niveauet. To på hinanden følgende trin med fejlslagne tool-kald tæller som svær fejlfinding og går til Pro-niveauet. Med `routing.step_routing: false` beholder en tur ét niveau.
- Et niveau bruges kun, hvis modellen er aktiveret og sund, og hvis samtalen stadig kan være i dens kontekstvindue.
- Efter `routing.attempts` fejl eskaleres arbejdet til næste niveau, og den fejlende model springes over i en kort afkølingsperiode. At afbryde en kørsel tæller aldrig som en modelfejl.
- `routing.preference` afvejer pris mod kvalitet: `cost-first`, `balanced` (standard) eller `quality-first`. Hver gang modellen skifter, viser sessionen en kort note med modellen, niveauet og hvorfor (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Alle OpenAI-kompatible servere: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Valgfrit. Roller, der ikke er sat, findes i kataloget.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Guide til opsætning af projektarbejdsområde

Appen kan sætte et helt projektarbejdsområde op for dig: den genererer artefakterne, verificerer dem, åbner projektet og starter den første opgave i en session. Åbn **Nyt projektarbejdsområde** fra projektstartsiden (grid-ikonet i headeren) eller fra kommandopaletten. Guiden spørger efter projektbeskrivelse og målmappe, et outputsprog, modelvalg (automatisk routing med tre modeller eller en låst model med præference `cost-first`, `balanced`, `quality-first`), eventuelt en lokal model (base-URL, model-id, udbyder-id, valgfri API-nøgle, timeout og maks. output-tokens) med et connectionstest, og om tidlig omkostningsbevidst komprimering skal aktiveres. Derefter arbejder den gennem synlige faser og lader sessionen med den første opgave stå åben; en fejlslagen fase kan genoptages, og en annulleret kørsel beholder de filer, der allerede er oprettet.

Der skrives intet hemmeligt på disken: den eventuelle lokale API-nøgle lægges i credential-lageret, og kun navnet på dens miljøvariabel kan optræde i projektets genererede `opencode.json`, som bruger de samme routing- og komprimeringsbeslutninger for senere arbejde i projektet.

### Automatisk komprimering

Lange sessioner opsummeres til et holdbart tjekpunkt, så samtalen stadig kan være i modellens vindue. To uafhængige udløsere deler den mekanisme.

**Komprimering ved kontekstgrænsen** er slået til som standard (`compaction.auto`): den kører, når det estimerede request overskrider modellens loft, beholder de seneste `compaction.keep.tokens` (15.000 som standard) ordret og opsummerer resten.

**Tidlig omkostningsbevidst komprimering** er valgfri (`compaction.early.enabled`) og griber ind, før grænsen er i sigte: den kører kun, når hele konteksten er på mindst `min_tokens` (24.000), og den del, der kan fjernes, alene er mindst `min_benefit_tokens` (8.000) tokens værd, højst én gang pr. `cooldown_seconds` (300) pr. session. `require_task_boundary` får den til at vente på en naturlig pause; standarden er `true`, men én tur med tool-kald når aldrig en sådan pause, så `false` er det, der får lange agentiske ture til at blive komprimeret overhovedet. `local_summarize` sender selve opsummeringen til den lokale model og registrerer den models forbrug og omkostninger.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Et komprimeringskør har brug for outputplads til sin egen opsummering; en lokal model med et lille `limit.output` kan løbe tør og fejle med `Compaction summary reached the output token limit` – sæt grænsen op eller lad `local_summarize` være fravælgt, når du ser det.

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Pakkehåndteringer
npm i -g @opencode/cli@latest      # eller bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS og Linux (anbefalet, altid up to date)
brew install opencode              # macOS og Linux (officiel brew formula, opdateres sjældnere)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # alle OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Fjern versioner ældre end 0.1.x før installation.

### Desktop-app (BETA)

OpenCode findes også som desktop-app. Download fra [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, eller AppImage     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installationsmappe

Installationsscriptet bruger følgende prioriteringsrækkefølge for installationsstien:

1. `$OPENCODE_INSTALL_DIR` - Tilpasset installationsmappe
2. `$XDG_BIN_DIR` - Sti der følger XDG Base Directory Specification
3. `$HOME/bin` - Standard bruger-bin-mappe (hvis den findes eller kan oprettes)
4. `$HOME/.opencode/bin` - Standard fallback

```bash
# Eksempler
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode har to indbyggede agents, som du kan skifte mellem med `Tab`-tasten.

- **build** - Standard, agent med fuld adgang til udviklingsarbejde
- **plan** - Skrivebeskyttet agent til analyse og kodeudforskning
  - Afviser filredigering som standard
  - Spørger om tilladelse før bash-kommandoer
  - Ideel til at udforske ukendte kodebaser eller planlægge ændringer

Derudover findes der en **general**-subagent til komplekse søgninger og flertrinsopgaver.
Den bruges internt og kan kaldes via `@general` i beskeder.

Læs mere om [agents](https://opencode.ai/docs/agents).

### Dokumentation

For mere info om konfiguration af OpenCode, [**se vores docs**](https://opencode.ai/docs).

### Bidrag

Hvis du vil bidrage til OpenCode, så læs vores [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygget på OpenCode

Hvis du arbejder på et projekt der er relateret til OpenCode og bruger "opencode" som en del af navnet; f.eks. "opencode-dashboard" eller "opencode-mobile", så tilføj en note i din README, der tydeliggør at projektet ikke er bygget af OpenCode-teamet og ikke er tilknyttet os på nogen måde.

---

**Bliv en del af vores community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
