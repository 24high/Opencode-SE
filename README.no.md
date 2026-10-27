<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">AI-kodeagent med åpen kildekode.</p>
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

### Automatisk modellruting

OpenCode kan velge en modell for hvert trinn i stedet for å beholde én modell hele sesjonen: en lokal eller billig modell gjør rutinearbeidet, og den sterkeste modellen reserveres til delene som virkelig trenger den. Ruting er slått av til du slår på `routing.enabled`.

Velg **Auto (Routing)** i modellvelgeren for å route en sesjon automatisk. Velger du en bestemt modell, låses sesjonen til den, og rutingen blander seg ikke borti.

| Nivå    | Standard                             | Dekker                                                                           |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | modellen i `qwen`-konfigurasjonen din | implementering, tester, refaktorering og build- og shell-trinnene som verifiserer dem |
| Routine | den billigste aktive DeepSeek Flash-modellen | planlegging, analyse, gjennomgang, forklaringer og vanlig feilsøking |
| Pro     | den sterkeste aktive DeepSeek-modellen | arkitektur og store refaktureringer, vanskelig feilsøking, sikkerhetskritisk arbeid |

- Den siste forespørselen din setter grunnklassifiseringen, og hvert trinn i turen blir klassifisert på nytt ut fra hva turen allerede har gjort: trinn som bare leser og søker, blir på Routine-nivået. Når ett trinn har endret filer eller kjørt en kommando, fortsetter resten av turen på Local-nivået. To etterfølgende trinn med mislykkede tool-kall teller som vanskelig feilsøking og går til Pro-nivået. Med `routing.step_routing: false` beholder en tur ett nivå.
- Et nivå brukes bare hvis modellen er aktivert og frisk, og hvis samtalen fortsatt får plass i kontekstvinduet hennes.
- Etter `routing.attempts` feil eskaleres arbeidet til neste nivå, og den feilende modellen hoppes over i en kort nedkjølingsperiode. Å avbryte en kjøring teller aldri som en modellfeil.
- `routing.preference` veier kostnad mot kvalitet: `cost-first`, `balanced` (standard) eller `quality-first`. Hver gang modellen byttes, viser sesjonen en kort notis med modellen, nivået og hvorfor (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Alle OpenAI-kompatible tjenere: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Valgfritt. Roller som ikke er satt, hentes fra katalogen.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Veiviser for oppsett av arbeidsområde

Appen kan sette opp et helt prosjektarbeidsområde for deg: den genererer artefaktene, verifiserer dem, åpner prosjektet og starter den første oppgaven i en sesjon. Åpne **Nytt prosjektarbeidsområde** fra prosjektforsiden (ruteikonet i topplinjen) eller fra kommandopaletten. Veiviseren spør etter prosjektbeskrivelse og målmappe, et outputspråk, modellvalg (automatisk ruting med tre modeller eller en låst modell med preferanse `cost-first`, `balanced`, `quality-first`), eventuelt en lokal modell (base-URL, modell-ID, leverandør-ID, valgfri API-nøkkel, tidsavbrudd og maks antall output-token) med en tilkoblingstest, og om tidlig kostnadsbevisst komprimering skal slås på. Deretter går den gjennom synlige faser og lar sesjonen med den første oppgaven stå åpen; en mislykket fase kan gjenopptas, og en avbrutt kjøring beholder filene som allerede er opprettet.

Det skrives ingen hemmeligheter til disk: den eventuelle lokale API-nøkkelen legges i credential-lageret, og bare navnet på miljøvariabelen hennes kan dukke opp i den genererte `opencode.json` for prosjektet, som bruker de samme ruting- og komprimeringsvedtakene for senere arbeid i prosjektet.

### Automatisk komprimering

Lange sesjoner oppsummeres til et holdbart kontrollpunkt, slik at samtalen fortsatt får plass i modellens vindu. To uavhengige utløsere deler den mekanismen.

**Komprimering ved kontekstgrensen** er slått på som standard (`compaction.auto`): den kjøres når det estimerte requestet går over taket til modellen, beholder de siste `compaction.keep.tokens` (15 000 som standard) ordrett og oppsummerer resten.

**Tidlig kostnadsbevisst komprimering** er valgfritt (`compaction.early.enabled`) og griper inn før grensen er i sikte: den kjøres bare når hele konteksten er på minst `min_tokens` (24 000), og bare når delen som kan fjernes alene er verdt minst `min_benefit_tokens` (8 000) token, høyst én gang hver `cooldown_seconds` (300) per sesjon. `require_task_boundary` får den til å vente på en naturlig pause; standarden er `true`, men én tur med tool-kall når aldri en slik pause, så `false` er det som gjør at lange agentiske turer komprimeres i det hele tatt. `local_summarize` sender selve oppsummeringen til den lokale modellen og registrerer forbruket og kostnaden til den modellen.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

En komprimeringskjøring trenger utdataplass til sin egen oppsummering; en lokal modell med lite `limit.output` kan gå tom og feile med `Compaction summary reached the output token limit` – skru opp grensen eller la `local_summarize` være slått av når du ser dette.

### Installasjon

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Pakkehåndterere
npm i -g @opencode/cli@latest      # eller bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS og Linux (anbefalt, alltid oppdatert)
brew install opencode              # macOS og Linux (offisiell brew-formel, oppdateres sjeldnere)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # alle OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Fjern versjoner eldre enn 0.1.x før du installerer.

### Desktop-app (BETA)

OpenCode er også tilgjengelig som en desktop-app. Last ned fra [opencode.ai/download](https://opencode.ai/download).

| Plattform             | Nedlasting                         |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` eller AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installasjonsmappe

Installasjonsskriptet bruker følgende prioritet for installasjonsstien:

1. `$OPENCODE_INSTALL_DIR` - Egendefinert installasjonsmappe
2. `$XDG_BIN_DIR` - Sti som følger XDG Base Directory Specification
3. `$HOME/bin` - Standard brukerbinar-mappe (hvis den finnes eller kan opprettes)
4. `$HOME/.opencode/bin` - Standard fallback

```bash
# Eksempler
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode har to innebygde agents du kan bytte mellom med `Tab`-tasten.

- **build** - Standard, agent med full tilgang for utviklingsarbeid
- **plan** - Skrivebeskyttet agent for analyse og kodeutforsking
  - Nekter filendringer som standard
  - Spør om tillatelse før bash-kommandoer
  - Ideell for å utforske ukjente kodebaser eller planlegge endringer

Det finnes også en **general**-subagent for komplekse søk og flertrinnsoppgaver.
Den brukes internt og kan kalles via `@general` i meldinger.

Les mer om [agents](https://opencode.ai/docs/agents).

### Dokumentasjon

For mer info om hvordan du konfigurerer OpenCode, [**se dokumentasjonen**](https://opencode.ai/docs).

### Bidra

Hvis du vil bidra til OpenCode, les [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygge på OpenCode

Hvis du jobber med et prosjekt som er relatert til OpenCode og bruker "opencode" som en del av navnet; for eksempel "opencode-dashboard" eller "opencode-mobile", legg inn en merknad i README som presiserer at det ikke er bygget av OpenCode-teamet og ikke er tilknyttet oss på noen måte.

---

**Bli med i fellesskapet** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
