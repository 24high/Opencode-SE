<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Logo do OpenCode">
    </picture>
  </a>
</p>
<p align="center">O agente de programação com IA de código aberto.</p>
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

### Roteamento automático de modelos

O OpenCode pode escolher um modelo para cada passo em vez de manter o mesmo modelo a sessão inteira: um modelo local ou barato faz o trabalho rotineiro e o modelo mais forte fica reservado para as partes que realmente precisam dele. O roteamento fica desligado até você ativar `routing.enabled`.

Escolha **Auto (Routing)** no seletor de modelos para rotear uma sessão automaticamente. Ao escolher um modelo específico, a sessão fica fixada nele e o roteamento não a altera.

| Nível   | Padrão                               | Cuida de                                                                        |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | o modelo na sua configuração `qwen`  | implementação, testes, refatorações e os passos de build e de shell que os verificam |
| Routine | o modelo DeepSeek Flash ativo mais barato | planejamento, análise, revisão, explicações e depuração comum     |
| Pro     | o modelo DeepSeek ativo mais forte   | arquitetura e grandes refatorações, depuração difícil, trabalho sensível a segurança |

- A sua solicitação mais recente define a classificação base e cada passo do turno é reclassificado a partir do que o turno já fez: passos que apenas leem e pesquisam ficam no nível Routine. Assim que um passo altera arquivos ou executa um comando, o restante do turno continua executando no nível Local. Dois passos consecutivos com chamadas de ferramentas malsucedidas são tratados como depuração difícil e vão para o nível Pro. Com `routing.step_routing: false`, o turno mantém um único nível.
- Um nível só é usado quando o modelo está ativado e saudável, e quando a conversa ainda cabe na sua janela de contexto.
- Depois de `routing.attempts` falhas, o trabalho sobe para o próximo nível e o modelo que falha é ignorado por um breve período de espera. Interromper uma execução nunca conta como falha do modelo.
- `routing.preference` equilibra custo e qualidade: `cost-first`, `balanced` (padrão) ou `quality-first`. Cada troca de modelo mostra uma nota com o modelo, o nível e o motivo (`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Qualquer servidor compatível com OpenAI: llama.cpp, Ollama, vLLM, LM Studio, ...
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
    // Opcional. Os papéis não definidos vêm do catálogo.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### Assistente de configuração do espaço de trabalho

O app configura um espaço de trabalho de projeto inteiro para você: gera os artefatos, verifica-os, abre o projeto e inicia a primeira tarefa em uma sessão. Abra **Novo espaço de trabalho do projeto** na tela inicial de projetos (o ícone de grade no cabeçalho) ou pela paleta de comandos. O assistente pede a descrição do projeto e o diretório de destino, um idioma de saída, a seleção de modelo (roteamento automático com três modelos ou um modelo fixo com preferência `cost-first`, `balanced`, `quality-first`), opcionalmente um modelo local (URL base, ID do modelo, ID do provedor, chave de API opcional, tempo limite e tokens máximos de saída) com um teste de conexão, e se a compactação antecipada consciente de custo deve ser ativada. Em seguida ele percorre etapas visíveis e deixa aberta a sessão da tarefa inicial; uma etapa com falha pode ser retomada e uma execução cancelada mantém os arquivos já criados.

Nada confidencial é gravado em disco: a chave de API local opcional vai para o armazenamento de credenciais e apenas o nome da sua variável de ambiente pode aparecer no `opencode.json` do projeto, que aplica as mesmas decisões de roteamento e compactação ao trabalho posterior naquele projeto.

### Compactação automática

Sessões longas são resumidas em um ponto de verificação durável para que a conversa continue cabendo na janela do modelo. Dois gatilhos independentes compartilham esse mecanismo.

**A compactação pelo limite de contexto** está ativada por padrão (`compaction.auto`): é executada quando a solicitação estimada ultrapassa o teto do modelo, mantém literalmente os `compaction.keep.tokens` mais recentes (15.000 por padrão) e resume o resto.

**A compactação antecipada consciente de custo** é opcional (`compaction.early.enabled`) e age antes de o limite estar à vista: só é executada quando todo o contexto soma pelo menos `min_tokens` (24.000) e a parte removível vale pelo menos `min_benefit_tokens` (8.000) tokens, no máximo uma vez a cada `cooldown_seconds` (300) por sessão. `require_task_boundary` faz com que ela espere uma pausa natural; o padrão é `true`, mas um turno de chamadas de ferramentas nunca chega a essa pausa, então `false` é o que faz os turnos agênticos longos serem compactados. `local_summarize` envia o resumo ao modelo local configurado e registra o uso e o custo desse modelo.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

Uma execução de compactação precisa de espaço de saída para o próprio resumo; um modelo local com um `limit.output` pequeno pode falhar com `Compaction summary reached the output token limit`. Nesse caso, aumente esse limite ou deixe `local_summarize` desativado.

### Instalação

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Gerenciadores de pacotes
npm i -g @opencode/cli@latest      # ou bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS e Linux (recomendado, sempre atualizado)
brew install opencode              # macOS e Linux (fórmula oficial do brew, atualiza menos)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # qualquer sistema
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Remova versões anteriores a 0.1.x antes de instalar.

### App desktop (BETA)

O OpenCode também está disponível como aplicativo desktop. Baixe em [opencode.ai/download](https://opencode.ai/download).

| Plataforma            | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` ou AppImage         |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Diretório de instalação

O script de instalação respeita a seguinte ordem de prioridade para o caminho de instalação:

1. `$OPENCODE_INSTALL_DIR` - Diretório de instalação personalizado
2. `$XDG_BIN_DIR` - Caminho compatível com a especificação XDG Base Directory
3. `$HOME/bin` - Diretório binário padrão do usuário (se existir ou puder ser criado)
4. `$HOME/.opencode/bin` - Fallback padrão

```bash
# Exemplos
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

O OpenCode inclui dois agents integrados, que você pode alternar com a tecla `Tab`.

- **build** - Padrão, agent com acesso total para trabalho de desenvolvimento
- **plan** - Agent somente leitura para análise e exploração de código
  - Nega edições de arquivos por padrão
  - Pede permissão antes de executar comandos bash
  - Ideal para explorar codebases desconhecidas ou planejar mudanças

Também há um subagent **general** para buscas complexas e tarefas em várias etapas.
Ele é usado internamente e pode ser invocado com `@general` nas mensagens.

Saiba mais sobre [agents](https://opencode.ai/docs/agents).

### Documentação

Para mais informações sobre como configurar o OpenCode, [**veja nossa documentação**](https://opencode.ai/docs).

### Contribuir

Se você tem interesse em contribuir com o OpenCode, leia os [contributing docs](./CONTRIBUTING.md) antes de enviar um pull request.

### Construindo com OpenCode

Se você estiver trabalhando em um projeto relacionado ao OpenCode e estiver usando "opencode" como parte do nome (por exemplo, "opencode-dashboard" ou "opencode-mobile"), adicione uma nota no README para deixar claro que não foi construído pela equipe do OpenCode e não é afiliado a nós de nenhuma forma.

---

**Junte-se à nossa comunidade** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
