<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">OpenCode je open source AI agent za programiranje.</p>
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

### Automatsko usmjeravanje modela

OpenCode može birati model za svaki korak umjesto da zadrži jedan model cijelu sesiju: lokalni ili jeftiniji model radi rutinski posao, a najjači model je rezervisan za dijelove koji ga zaista trebaju. Usmjeravanje je isključeno dok ne uključite `routing.enabled`.

Odaberite **Auto (Routing)** u biraču modela da sesija automatski usmjerava model. Ako odaberete određeni model, sesija se vezuje za njega i usmjeravanje se ne miješa.

| Nivo    | Zadano                               | Radi                                                              |
| ------- | ------------------------------------ | ------------------------------------------------------------------ |
| Local   | model iz vaše `qwen` konfiguracije   | implementacija, testovi, refactoriranje te build i shell koraci koji ih provjeravaju |
| Routine | najjeftiniji aktivni DeepSeek Flash model | planiranje, analiza, pregled, objašnjenja i uobičajeno debagiranje |
| Pro     | najjači aktivni DeepSeek model       | arhitektura i veliki refactorinzi, teško debagiranje, posao osjetljiv na sigurnost |

- Vaš zadnji zahtjev određuje osnovnu klasifikaciju, a zatim se svaki korak u krugu ponovo klasificira na osnovu toga šta je krug već uradio: koraci koji samo čitaju i pretražuju ostaju na Routine nivou. Čim neki korak izmijeni datoteke ili pokrene komandu, ostatak kruga nastavlja izvršavanje na Local nivou. Dva uzastopna koraka s neuspjelim pozivima alata računaju se kao teško debagiranje i idu na Pro nivo. Uz `routing.step_routing: false` krug ostaje na jednom nivou.
- Nivo se koristi samo kad je model uključen i trenutno ispravan te kad konverzacija i dalje staje u njegov kontekstni prozor.
- Nakon `routing.attempts` neuspjeha posao prelazi na sljedeći nivo, a model koji ne radi preskače se na kratko vrijeme. Prekid izvršavanja nikada se ne računa kao greška modela.
- `routing.preference` balansira između cijene i kvaliteta: `cost-first`, `balanced` (podrazumijevano) ili `quality-first`. Pri svakoj promjeni modela sesija prikazuje kratku bilješku s modelom, nivoom i razlogom (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Bilo koji OpenAI-kompatibilan server: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Opcionalno. Uloge koje nisu postavljene preuzimaju se iz kataloga.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Čarobnjak za postavljanje radnog okruženja

Aplikacija može postaviti čitavo radno okruženje projekta umjesto vas: generiše artefakte, provjerava ih, otvara projekat i pokreće prvi zadatak u sesiji. Otvorite **Novi radni prostor projekta** na početnoj strani projekata (ikona mreže u zaglavlju) ili iz palete komandi. Čarobnjak pita za opis projekta i direktorij u koji se generiše, jezik izlaza, izbor modela (automatsko usmjeravanje s tri modela ili vezani model uz preferenciju `cost-first`, `balanced`, `quality-first`), opciono lokalni model (bazni URL, ID modela, ID pružaoca, opcioni API ključ, tajmaut i maksimalni izlazni tokeni) sa testom konekcije te da li uključiti rano štedljivo sažimanje. Zatim prolazi kroz vidljive faze i ostavlja otvorenu sesiju s početnim zadatkom; neuspjela faza se može nastaviti, a otkazano izvršavanje zadržava datoteke koje su već kreirane.

Na disk se ne piše ništa tajno: opcioni lokalni API ključ ide u spremnik kredencijala i samo ime njegove env varijable može se pojaviti u generisanom projektnom `opencode.json`, koji primjenjuje iste odluke o usmjeravanju i sažimanju na kasniji rad u tom projektu.

### Automatsko sažimanje

Duge sesije sažimaju se u trajnu kontrolnu tačku tako da konverzacija i dalje staje u prozor modela. Dva nezavisna okidača koriste isti mehanizam.

**Sažimanje zbog granice konteksta** uključeno je podrazumijevano (`compaction.auto`): izvršava se kada procijenjeni zahtjev pređe plafon modela, doslovno čuva zadnjih `compaction.keep.tokens` (15.000 podrazumijevano) a ostatak sažima.

**Rano štedljivo sažimanje** je opcionalno (`compaction.early.enabled`) i djeluje prije nego što je granica na vidiku: izvršava se samo kad cjelokupni kontekst iznosi barem `min_tokens` (24.000) i kad samo uklonjivi dio vrijedi barem `min_benefit_tokens` (8.000) tokena, najviše jednom na `cooldown_seconds` (300) po sesiji. `require_task_boundary` čeka prirodnu pauzu; zadana vrijednost je `true`, ali jedan krug poziva alata nikada ne dolazi do takve pauze, pa je `false` ono što omogućava da se dugi agentski krugovi uopšte sažimaju. `local_summarize` šalje sažetak lokalnom modelu i bilježi njegovo korištenje i cijenu.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Izvršavanje sažimanja treba izlazni prostor za sopstveni sažetak; lokalni model s malim `limit.output` može ostati bez njega i pasti s `Compaction summary reached the output token limit` – povećajte to ograničenje ili isključite `local_summarize` kada to vidite.

### Instalacija

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Package manageri
npm i -g @opencode/cli@latest      # ili bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS i Linux (preporučeno, uvijek ažurno)
brew install opencode              # macOS i Linux (zvanična brew formula, rjeđe se ažurira)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Bilo koji OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Ukloni verzije starije od 0.1.x prije instalacije.

### Desktop aplikacija (BETA)

OpenCode je dostupan i kao desktop aplikacija. Preuzmi je sa [opencode.ai/download](https://opencode.ai/download).

| Platforma             | Preuzimanje                        |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, ili AppImage       |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Instalacijski direktorij

Instalacijska skripta koristi sljedeći redoslijed prioriteta za putanju instalacije:

1. `$OPENCODE_INSTALL_DIR` - Prilagođeni instalacijski direktorij
2. `$XDG_BIN_DIR` - Putanja usklađena sa XDG Base Directory specifikacijom
3. `$HOME/bin` - Standardni korisnički bin direktorij (ako postoji ili se može kreirati)
4. `$HOME/.opencode/bin` - Podrazumijevana rezervna lokacija

```bash
# Primjeri
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agenti

OpenCode uključuje dva ugrađena agenta između kojih možeš prebacivati tasterom `Tab`.

- **build** - Podrazumijevani agent sa punim pristupom za razvoj
- **plan** - Agent samo za čitanje za analizu i istraživanje koda
  - Podrazumijevano zabranjuje izmjene datoteka
  - Traži dozvolu prije pokretanja bash komandi
  - Idealan za istraživanje nepoznatih codebase-ova ili planiranje izmjena

Uključen je i **general** pod-agent za složene pretrage i višekoračne zadatke.
Koristi se interno i može se pozvati pomoću `@general` u porukama.

Saznaj više o [agentima](https://opencode.ai/docs/agents).

### Dokumentacija

Za više informacija o konfiguraciji OpenCode-a, [**pogledaj dokumentaciju**](https://opencode.ai/docs).

### Doprinosi

Ako želiš doprinositi OpenCode-u, pročitaj [upute za doprinošenje](./CONTRIBUTING.md) prije slanja pull requesta.

### Gradnja na OpenCode-u

Ako radiš na projektu koji je povezan s OpenCode-om i koristi "opencode" kao dio naziva, npr. "opencode-dashboard" ili "opencode-mobile", dodaj napomenu u svoj README da projekat nije napravio OpenCode tim i da nije povezan s nama.

---

**Pridruži se našoj zajednici** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
