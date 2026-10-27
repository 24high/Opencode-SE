<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">오픈 소스 AI 코딩 에이전트.</p>
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

### 자동 모델 라우팅

OpenCode는 세션 전체에 대해 하나의 모델을 고정하는 대신 단계마다 모델을 고릅니다. 로컬이나 저렴한 모델이 일상적인 작업을 맡고, 가장 강력한 모델은 실제로 필요한 부분을 위해 아껴 둡니다. `routing.enabled`를 켤 때까지 라우팅은 꺼져 있습니다.

모델 선택기에서 **Auto (Routing)**을 고르면 세션이 자동으로 라우팅됩니다. 특정 모델을 고르면 그 세션이 고정되어 라우팅이 개입하지 않습니다.

| 계층    | 기본값                               | 담당 범위                                                                        |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Local   | `qwen` 설정의 모델                   | 구현, 테스트, 리팩터링, 그리고 이를 검증하는 빌드와 셸 단계                       |
| Routine | 가장 저렴한 활성 DeepSeek Flash 모델 | 계획, 분석, 리뷰, 설명, 일반적인 디버깅                                          |
| Pro     | 가장 강력한 활성 DeepSeek 모델       | 아키텍처와 대규모 리팩터링, 어려운 디버깅, 보안에 민감한 작업                     |

- 최근 요청이 기본 분류를 정하고, 이후 턴 안의 각 단계는 그 턴이 이미 한 일에 따라 다시 분류됩니다. 읽기와 검색만 하는 단계는 Routine 계층에 남아 있습니다. 어떤 단계가 파일을 바꾸거나 명령을 실행하면 턴의 나머지는 Local 계층에서 실행을 이어갑니다. 도구 호출이 실패한 단계가 두 번 연속되면 어려운 디버깅으로 간주되어 Pro 계층으로 넘어갑니다. `routing.step_routing: false`로 설정하면 한 터 내내 하나의 계층을 유지합니다.
- 어떤 계층은 그 모델이 활성화되어 있고 현재 정상이며, 대화가 여전히 그 컨텍스트 창에 들어갈 때만 사용됩니다.
- `routing.attempts`번 실패하면 작업은 다음 계층으로 에스컬레이션되고, 실패하는 모델은 짧은 쿨다운 기간 동안 건너뜁니다. 실행을 중단하는 것은 절대 모델 실패로 계산되지 않습니다.
- `routing.preference`는 비용과 품질 사이에서 균형을 잡습니다: `cost-first`, `balanced`(기본값), `quality-first`. 라우팅이 다른 모델을 고를 때마다 세션은 그 모델과 계층, 선택 이유를 적은 짧은 메모를 표시합니다(`routing.diagnostics`).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // OpenAI 호환 서버라면 무엇이든: llama.cpp, Ollama, vLLM, LM Studio 등
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
    // 선택 사항. 지정하지 않은 역할은 카탈로그에서 찾습니다.
    "roles": { "local": "local/qwen3-coder", "routine": "deepseek/deepseek-chat", "pro": "deepseek/deepseek-reasoner" },
    "step_routing": true,
  },
}
```

### 작업 공간 설정 마법사

앱은 프로젝트 작업 공간 전체를 설정할 수 있습니다. 결과물을 생성하고, 검증하고, 프로젝트를 열고, 세션에서 첫 작업을 시작합니다. 프로젝트 홈(헤더의 격자 아이콘)에서 **New project workspace**를 열거나 명령 팔레트에서 실행하세요. 마법사는 프로젝트 설명과 생성할 디렉터리, 출력 언어, 모델 선택(자동 3모델 라우팅, 또는 고정 모델에 `cost-first`, `balanced`, `quality-first` 설정을 더한 것), 선택적으로 로컬 모델(기본 URL, 모델 ID, 제공자 ID, 선택적 API 키, 타임아웃, 최대 출력 토큰)과 연결 테스트, 그리고 조기 비용 인지 압축을 켤지 여부를 묻습니다. 이후 보이는 단계를 차례로 진행하고 초기 작업 세션을 열린 상태로 남깁니다. 실패한 단계는 다시 시작할 수 있고, 취소된 실행은 이미 만든 파일을 그대로 둡니다.

비밀 정보는 디스크에 기록되지 않습니다. 선택적 로컬 API 키는 자격 증명 저장소에 저장되고, 생성된 프로젝트의 `opencode.json`에는 그 환경 변수 이름만 나타날 수 있습니다. 이 파일은 그 프로젝트에서의 이후 작업에도 같은 라우팅과 압축 결정을 적용합니다.

### 자동 압축

긴 세션은 대화가 모델의 창에 계속 들어가도록 영속적인 체크포인트로 요약됩니다. 두 개의 독립적인 트리거가 이 메커니즘을 공유합니다.

**컨텍스트 한도 압축**은 기본적으로 켜져 있습니다(`compaction.auto`). 추정 요청이 모델의 상한(창에서 10%, 또는 최소 16,000토큰을 뺀 값, 혹은 `compaction.buffer`를 설정했다면 그 값)을 넘을 때 실행됩니다. 체크포인트는 대화의 최근 `compaction.keep.tokens`(기본값 15,000)를 그대로 보존하고 나머지를 요약합니다. 이것은 안전망이며, 아래의 조기 트리거가 건너뛸 때도 반드시 동작합니다.

**조기 비용 인지 압축**은 옵트인입니다(`compaction.early.enabled`, 기본값 꺼짐). 한도가 눈에 보이기 전에 작동해 아직 비용이 싸 사이에 낡은 컨텍스트를 정리합니다. 실행 조건은 컨텍스트 전체가 `min_tokens`(24,000) 이상이고, 제거할 부분 자체가 `min_benefit_tokens`(8,000)토큰 이상의 값일 때뿐이며, 세션마다 `cooldown_seconds`(300)초에 최대 한 번입니다. `require_task_boundary`는 자연스러운 끊김을 기다립니다. 기본값은 `true`지만, 도구 호출 턴은 그런 끊김에 절대 도달하지 않으므로 긴 에이전트 턴을 실제로 압축하게 만들려면 `false`로 설정하세요. `local_summarize`는 요약 자체를 설정된 로컬 모델로 보내고 그 모델의 사용량과 비용을 기록합니다.

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "early": { "enabled": true, "min_tokens": 24000, "min_benefit_tokens": 8000, "cooldown_seconds": 300, "require_task_boundary": false, "local_summarize": false },
  },
}
```

압축 실행은 자기 요약을 위한 출력 영역이 필요합니다. `limit.output`가 작은 로컬 모델(예를 들어 8,192)은 아주 큰 세션에서 그것을 다 써버리고 `Compaction summary reached the output token limit`로 실패할 수 있습니다. 그럴 때는 해당 한도를 올리거나 `local_summarize`를 꺼 두세요.

### 설치

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# 패키지 매니저
npm i -g @opencode/cli@latest      # bun/pnpm/yarn 도 가능
brew install anomalyco/tap/opencode-v2 # macOS 및 Linux (권장, 항상 최신)
brew install opencode              # macOS 및 Linux (공식 brew formula, 업데이트 빈도 낮음)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # 어떤 OS든
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> 설치 전에 0.1.x 보다 오래된 버전을 제거하세요.

### 데스크톱 앱 (BETA)

OpenCode 는 데스크톱 앱으로도 제공됩니다. [opencode.ai/download](https://opencode.ai/download) 에서 다운로드하세요.

| 플랫폼                | 다운로드                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, 또는 AppImage      |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### 설치 디렉터리

설치 스크립트는 설치 경로를 다음 우선순위로 결정합니다.

1. `$OPENCODE_INSTALL_DIR` - 사용자 지정 설치 디렉터리
2. `$XDG_BIN_DIR` - XDG Base Directory Specification 준수 경로
3. `$HOME/bin` - 표준 사용자 바이너리 디렉터리 (존재하거나 생성 가능할 경우)
4. `$HOME/.opencode/bin` - 기본 폴백

```bash
# 예시
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/v2/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/v2/install | bash
```

### Agents

OpenCode 에는 내장 에이전트 2개가 있으며 `Tab` 키로 전환할 수 있습니다.

- **build** - 기본값, 개발 작업을 위한 전체 권한 에이전트
- **plan** - 분석 및 코드 탐색을 위한 읽기 전용 에이전트
  - 기본적으로 파일 편집을 거부
  - bash 명령 실행 전에 권한을 요청
  - 낯선 코드베이스를 탐색하거나 변경을 계획할 때 적합

또한 복잡한 검색과 여러 단계 작업을 위한 **general** 서브 에이전트가 포함되어 있습니다.
내부적으로 사용되며, 메시지에서 `@general` 로 호출할 수 있습니다.

[agents](https://opencode.ai/docs/agents) 에 대해 더 알아보세요.

### 문서

OpenCode 설정에 대한 자세한 내용은 [**문서**](https://opencode.ai/docs) 를 참고하세요.

### 기여하기

OpenCode 에 기여하고 싶다면, Pull Request 를 제출하기 전에 [contributing docs](./CONTRIBUTING.md) 를 읽어주세요.

### OpenCode 기반으로 만들기

OpenCode 와 관련된 프로젝트를 진행하면서 이름에 "opencode"(예: "opencode-dashboard" 또는 "opencode-mobile") 를 포함한다면, README 에 해당 프로젝트가 OpenCode 팀이 만든 것이 아니며 어떤 방식으로도 우리와 제휴되어 있지 않다는 점을 명시해 주세요.

---

**커뮤니티에 참여하기** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
