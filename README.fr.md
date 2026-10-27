<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo OpenCode">
    </picture>
  </a>
</p>
<p align="center">L'agent de codage IA open source.</p>
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

### Routage automatique des modèles

OpenCode peut choisir un modèle pour chaque étape au lieu de garder le même modèle pendant toute la session : un modèle local ou économique effectue le travail courant et le modèle le plus performant est réservé aux parties qui en ont réellement besoin. Le routage reste désactivé tant que vous n'activez pas `routing.enabled`.

Choisissez **Auto (Routing)** dans le sélecteur de modèles pour router une session automatiquement. Choisir un modèle précis épingle cette session et le routage n'y touche plus.

| Niveau  | Par défaut                           | Prend en charge                                                                 |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | le modèle de votre configuration `qwen` | implémentation, tests, refactors et les étapes de build et de shell qui les vérifient |
| Routine | le modèle DeepSeek Flash actif le moins cher | planification, analyse, revue, explications et débogage courant    |
| Pro     | le modèle DeepSeek actif le plus performant | architecture et gros refactors, débogage difficile, travail sensible à la sécurité |

- Votre dernière requête définit la classification de base, puis chaque étape du tour est reclassée selon ce que le tour a déjà fait : les étapes qui ne font que lire et chercher restent sur le niveau Routine. Dès qu'une étape a modifié des fichiers ou exécuté une commande, la suite du tour continue de s'exécuter sur le niveau Local. Deux étapes consécutives avec des appels d'outils échoués sont considérées comme un débogage difficile et passent au niveau Pro. Avec `routing.step_routing: false`, un tour garde un seul niveau.
- Un niveau n'est utilisé que si son modèle est activé, actuellement sain, et si la conversation tient encore dans sa fenêtre de contexte.
- Après `routing.attempts` échecs, le travail passe au niveau supérieur et le modèle en échec est évité pendant un court délai de carence. Interrompre une exécution n'est jamais compté comme un échec du modèle.
- `routing.preference` arbitre le coût et la qualité : `cost-first`, `balanced` (par défaut) ou `quality-first`. Chaque changement de modèle affiche une note indiquant le modèle, son niveau et la raison (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // N'importe quel serveur compatible OpenAI : llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Facultatif. Les rôles non définis sont trouvés dans le catalogue.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Assistant de configuration d'espace de travail

L'application peut préparer tout un espace de travail de projet pour vous : elle génère les artefacts, les vérifie, ouvre le projet et démarre la première tâche dans une session. Ouvrez **Nouvel espace de travail projet** depuis l'accueil des projets (l'icône en grille de l'en-tête) ou depuis la palette de commandes. L'assistant demande la description du projet et le répertoire de destination, une langue de sortie, la sélection du modèle (routage automatique à trois modèles ou un modèle épinglé avec une préférence `cost-first`, `balanced`, `quality-first`), éventuellement un modèle local (URL de base, identifiant du modèle, identifiant du fournisseur, clé d'API facultative, délai d'expiration, jetons de sortie maximaux) avec un test de connexion, puis s'il faut activer la compaction anticipée consciente du coût. Il enchaîne ensuite des étapes visibles et laisse ouverte la session de la première tâche ; une étape échouée peut être reprise et une exécution annulée conserve les fichiers déjà créés.

Rien de secret n'est écrit sur le disque : la clé d'API locale facultative va dans le magasin d'identifiants et seul le nom de sa variable d'environnement peut apparaître dans le fichier `opencode.json` du projet, qui applique les mêmes décisions de routage et de compaction aux travaux suivants de ce projet.

### Compaction automatique

Les sessions longues sont résumées en un point de contrôle durable pour que la conversation continue de tenir dans la fenêtre du modèle. Deux déclencheurs indépendants partagent ce mécanisme.

**La compaction par limite de contexte** est activée par défaut (`compaction.auto`) : elle s'exécute quand la requête estimée dépasse le plafond du modèle, conserve tels quels les derniers `compaction.keep.tokens` (15 000 par défaut) et résume le reste.

**La compaction anticipée consciente du coût** est optionnelle (`compaction.early.enabled`) et agit avant que la limite soit en vue : elle ne s'exécute que si l'ensemble du contexte atteint au moins `min_tokens` (24 000) et que la partie supprimable vaut au moins `min_benefit_tokens` (8 000) jetons, au plus une fois toutes les `cooldown_seconds` (300) par session. `require_task_boundary` la fait attendre une pause naturelle ; sa valeur par défaut est `true`, mais un tour d'appels d'outils n'atteint jamais une telle pause, donc `false` est ce qui permet de compacter les longs tours agentiques. `local_summarize` envoie le résumé au modèle local configuré et enregistre sa consommation et son coût.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Une exécution de compaction a besoin d'espace de sortie pour son propre résumé ; un modèle local avec un `limit.output` petit peut échouer avec `Compaction summary reached the output token limit`. Dans ce cas, augmentez cette limite ou laissez `local_summarize` désactivé.

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Gestionnaires de paquets
npm i -g @opencode/cli@latest      # ou bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS et Linux (recommandé, toujours à jour)
brew install opencode              # macOS et Linux (formule officielle brew, mise à jour moins fréquente)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # n'importe quel OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Supprimez les versions antérieures à 0.1.x avant d'installer.

### Application de bureau (BETA)

OpenCode est aussi disponible en application de bureau. Téléchargez-la depuis [opencode.ai/download](https://opencode.ai/download).

| Plateforme            | Téléchargement                     |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, ou AppImage        |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Répertoire d'installation

Le script d'installation respecte l'ordre de priorité suivant pour le chemin d'installation :

1. `$OPENCODE_INSTALL_DIR` - Répertoire d'installation personnalisé
2. `$XDG_BIN_DIR` - Chemin conforme à la spécification XDG Base Directory
3. `$HOME/bin` - Répertoire binaire utilisateur standard (s'il existe ou peut être créé)
4. `$HOME/.opencode/bin` - Repli par défaut

```bash
# Exemples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode inclut deux agents intégrés que vous pouvez basculer avec la touche `Tab`.

- **build** - Par défaut, agent avec accès complet pour le travail de développement
- **plan** - Agent en lecture seule pour l'analyse et l'exploration du code
  - Refuse les modifications de fichiers par défaut
  - Demande l'autorisation avant d'exécuter des commandes bash
  - Idéal pour explorer une base de code inconnue ou planifier des changements

Un sous-agent **general** est aussi inclus pour les recherches complexes et les tâches en plusieurs étapes.
Il est utilisé en interne et peut être invoqué via `@general` dans les messages.

En savoir plus sur les [agents](https://opencode.ai/docs/agents).

### Documentation

Pour plus d'informations sur la configuration d'OpenCode, [**consultez notre documentation**](https://opencode.ai/docs).

### Contribuer

Si vous souhaitez contribuer à OpenCode, lisez nos [docs de contribution](./CONTRIBUTING.md) avant de soumettre une pull request.

### Construire avec OpenCode

Si vous travaillez sur un projet lié à OpenCode et que vous utilisez "opencode" dans le nom du projet (par exemple, "opencode-dashboard" ou "opencode-mobile"), ajoutez une note dans votre README pour préciser qu'il n'est pas construit par l'équipe OpenCode et qu'il n'est pas affilié à nous.

---

**Rejoignez notre communauté** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
