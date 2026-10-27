<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">El agente de programación con IA de código abierto.</p>
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

### Enrutado automático de modelos

OpenCode puede elegir un modelo para cada paso en lugar de mantener el mismo durante toda la sesión: un modelo local o económico hace el trabajo rutinario y el modelo más potente se reserva para las partes que de verdad lo necesitan. El enrutado permanece apagado hasta que actives `routing.enabled`.

Elige **Auto (Routing)** en el selector de modelos para enrutar una sesión automáticamente. Si eliges un modelo concreto, la sesión queda fijada a él y el enrutado no lo toca.

| Nivel   | Valor predeterminado                 | Se encarga de                                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | el modelo de tu configuración `qwen` | implementación, pruebas, refactorizaciones y los pasos de compilación y consola que las verifican |
| Routine | el modelo DeepSeek Flash activo más barato | planificación, análisis, revisión, explicaciones y depuración habitual  |
| Pro     | el modelo DeepSeek activo más potente | arquitectura y refactorizaciones grandes, depuración difícil, trabajo sensible a la seguridad |

- Tu última petición define la clasificación base y después cada paso del turno se reclasifica según lo que el turno ya ha hecho: los pasos que solo leen y buscan se quedan en el nivel Routine. En cuanto un paso modifica archivos o ejecuta un comando, el resto del turno sigue ejecutando en el nivel Local. Dos pasos consecutivos con llamadas a herramientas fallidas se consideran depuración difícil y pasan al nivel Pro. Con `routing.step_routing: false` el turno se queda en un solo nivel.
- Un nivel solo se usa si su modelo está activado y sano, y si la conversación todavía cabe en su ventana de contexto.
- Tras `routing.attempts` fallos, el trabajo escala al siguiente nivel y el modelo que falla se omite durante una breve pausa de enfriamiento. Interrumpir una ejecución nunca cuenta como fallo del modelo.
- `routing.preference` equilibra coste y calidad: `cost-first`, `balanced` (predeterminado) o `quality-first`. Cada cambio de modelo muestra una nota con el modelo, su nivel y el motivo (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Cualquier servidor compatible con OpenAI: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Opcional. Los roles sin definir se obtienen del catálogo.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Asistente de configuración del espacio de trabajo

La aplicación puede preparar por ti todo el espacio de trabajo de un proyecto: genera los artefactos, los verifica, abre el proyecto y arranca la primera tarea en una sesión. Abre **Nuevo espacio de trabajo de proyecto** desde la pantalla de proyectos (el icono de rejilla de la cabecera) o desde la paleta de comandos. El asistente pregunta por la descripción y el directorio del proyecto, el idioma de salida, la selección de modelo (enrutado automático de tres modelos o un modelo fijo con preferencia `cost-first`, `balanced`, `quality-first`), de forma opcional un modelo local (URL base, ID del modelo, ID del proveedor, clave de API opcional, tiempo de espera y tokens máximos de salida) con una prueba de conexión, y si se activa la compactación anticipada consciente del coste. Después recorre etapas visibles y deja abierta la sesión inicial ya creada; una etapa fallida puede reanudarse y una ejecución cancelada conserva los archivos ya creados.

No se escribe nada secreto en disco: la clave de API local opcional va al almacén de credenciales y en el `opencode.json` del proyecto solo puede aparecer el nombre de su variable de entorno. Ese archivo aplica las mismas decisiones de enrutado y compactación al trabajo posterior en el proyecto.

### Compactación automática

Las sesiones largas se resumen en un punto de control persistente para que la conversación siga cabiendo en la ventana del modelo. Dos disparadores independientes comparten ese mecanismo.

**La compactación por límite de contexto** está activada de forma predeterminada (`compaction.auto`): se ejecuta cuando la petición estimada supera el techo del modelo, conserva literalmente los últimos `compaction.keep.tokens` (15.000 de forma predeterminada) y resume el resto.

**La compactación anticipada consciente del coste** es opcional (`compaction.early.enabled`) y actúa antes de tener el límite a la vista: solo se ejecuta si todo el contexto suma al menos `min_tokens` (24.000) y la parte eliminable aporta al menos `min_benefit_tokens` (8.000) tokens, como máximo una vez cada `cooldown_seconds` (300) por sesión. `require_task_boundary` la hace esperar a un descanso natural; su valor predeterminado es `true`, pero un turno de llamadas a herramientas nunca alcanza ese descanso, así que `false` es lo que permite compactar los turnos agénticos largos. `local_summarize` envía el resumen al modelo local configurado y registra su uso y coste.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Una ejecución de compactación necesita espacio de salida para su propio resumen; un modelo local con un `limit.output` pequeño puede fallar con `Compaction summary reached the output token limit`. En ese caso sube ese límite o deja `local_summarize` desactivado.

### Instalación

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Gestores de paquetes
npm i -g @opencode/cli@latest      # o bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS y Linux (recomendado, siempre al día)
brew install opencode              # macOS y Linux (fórmula oficial de brew, se actualiza menos)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # cualquier sistema
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Elimina versiones anteriores a 0.1.x antes de instalar.

### App de escritorio (BETA)

OpenCode también está disponible como aplicación de escritorio. Descárgala desde [opencode.ai/download](https://opencode.ai/download).

| Plataforma            | Descarga                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, o AppImage         |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Directorio de instalación

El script de instalación respeta el siguiente orden de prioridad para la ruta de instalación:

1. `$OPENCODE_INSTALL_DIR` - Directorio de instalación personalizado
2. `$XDG_BIN_DIR` - Ruta compatible con la especificación XDG Base Directory
3. `$HOME/bin` - Directorio binario estándar del usuario (si existe o se puede crear)
4. `$HOME/.opencode/bin` - Alternativa por defecto

```bash
# Ejemplos
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agentes

OpenCode incluye dos agentes integrados que puedes alternar con la tecla `Tab`.

- **build** - Por defecto, agente con acceso completo para tareas de desarrollo
- **plan** - Agente de solo lectura para análisis y exploración de código
  - Deniega ediciones de archivos por defecto
  - Pide permiso antes de ejecutar comandos bash
  - Ideal para explorar codebases desconocidas o planificar cambios

Además, incluye un subagente **general** para búsquedas complejas y tareas de varios pasos.
Se usa internamente y se puede invocar con `@general` en los mensajes.

Más información sobre [agentes](https://opencode.ai/docs/agents).

### Documentación

Para más información sobre cómo configurar OpenCode, [**ve a nuestra documentación**](https://opencode.ai/docs).

### Contribuir

Si te interesa contribuir a OpenCode, lee nuestras [docs de contribución](./CONTRIBUTING.md) antes de enviar un pull request.

### Proyectos basados en OpenCode

Si estás trabajando en un proyecto basado en OpenCode y usas "opencode" como parte del nombre, por ejemplo, "opencode-dashboard" u "opencode-mobile", agrega una nota en tu README para aclarar que no está hecho por el equipo de OpenCode y que no está afiliado con nosotros de ninguna manera.

---

**Únete a nuestra comunidad** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
