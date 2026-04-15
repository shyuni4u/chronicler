# Backend Core Design — Chronicler

> 1차 구현: FastAPI 백엔드 + DAG 오케스트레이터 + 에이전트 + SSE + SQLite

## 결정 사항

| 항목 | 결정 |
|------|------|
| 오케스트레이션 | DAG 기반 (Phase 간 순차, Phase 내 에이전트 DAG) |
| State 저장 | 하이브리드 — bible은 마크다운, state/메타는 SQLite |
| DAG 정의 | JSON 설정 파일 (`config/phases.json`) |
| 프론트엔드 | 3단계 중 3차에서 구현 (편집기 통합형) |
| 구현 단위 | 3단계 — 1차 백엔드 코어 → 2차 bible 검증/scripts → 3차 Next.js |

## 아키텍처

```
┌─────────────────────────────────────────┐
│              FastAPI Server              │
├─────────┬───────────┬───────────────────┤
│ Routes  │ SSE Stream│  Bible Service    │
│ /phases │ /stream   │  (read markdown)  │
├─────────┴───────────┴───────────────────┤
│           Orchestrator                   │
│  ┌─────────────────────────────┐        │
│  │  DAG Engine                 │        │
│  │  (JSON config → 실행 순서)   │        │
│  └──────────┬──────────────────┘        │
│             │                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │World │ │Char  │ │Plot  │ │Writer/ │ │
│  │Build │ │Design│ │Archi │ │Editor  │ │
│  └──────┘ └──────┘ └──────┘ └────────┘ │
├──────────────────────────────────────────┤
│  SQLite (phase state, chapter metadata)  │
│  bible/ (markdown files)                 │
└──────────────────────────────────────────┘
```

## 디렉토리 구조

```
backend/
  main.py              # FastAPI app 진입점
  config.py            # 환경 설정 (Pydantic Settings)
  database.py          # SQLite 연결 + 초기화
  api/
    routes.py          # 라우트 정의
    sse.py             # SSE 스트리밍 헬퍼
  agents/
    base.py            # BaseAgent 추상 클래스
    world_builder.py
    character_designer.py
    plot_architect.py
    writer.py
    editor.py
  orchestrator/
    engine.py          # DAG 파싱 + 토폴로지 정렬 + 실행
    phase_runner.py    # Phase 단위 실행 (상태 관리 포함)
  services/
    bible.py           # bible/ 마크다운 읽기 + 파싱
    state.py           # SQLite CRUD (phase_state, agent_runs, chapters)
config/
  phases.json          # DAG 정의
```

## DAG JSON 구조 — `config/phases.json`

```json
{
  "phases": [
    {
      "id": "01_world_building",
      "name": "World Building",
      "agents": [
        { "id": "world_builder", "depends_on": [] }
      ]
    },
    {
      "id": "02_characters",
      "name": "Characters",
      "depends_on_phase": "01_world_building",
      "agents": [
        { "id": "character_designer", "depends_on": [] }
      ]
    },
    {
      "id": "03_plot",
      "name": "Plot Architecture",
      "depends_on_phase": "02_characters",
      "agents": [
        { "id": "plot_architect", "depends_on": [] }
      ]
    },
    {
      "id": "04_chapter_N",
      "name": "Chapter Writing",
      "depends_on_phase": "03_plot",
      "agents": [
        { "id": "writer", "depends_on": [] },
        { "id": "editor", "depends_on": ["writer"] }
      ]
    }
  ]
}
```

- `depends_on_phase`: 이전 Phase가 완료되어야 실행 가능
- `agents[].depends_on`: Phase 내 에이전트 간 의존관계 (DAG)
- `depends_on`이 비어 있으면 병렬 실행 가능

## 에이전트 설계

### BaseAgent

```python
class BaseAgent(ABC):
    agent_id: str
    system_prompt: str

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Anthropic SDK 호출. SSE를 위해 async generator로 토큰 yield."""
        ...
```

### AgentContext

```python
@dataclass
class AgentContext:
    bible: dict            # bible 마크다운 파싱 결과
    phase_state: dict      # 현재까지의 Phase 실행 결과
    dependencies: dict     # DAG 내 선행 에이전트 결과 (agent_id → output)
    chapter_num: int | None  # 챕터 Phase일 때만 사용
```

### AgentResult

```python
@dataclass
class AgentResult:
    agent_id: str
    output: str            # 에이전트 출력 전문
    metadata: dict         # 추가 메타 (word_count 등)
```

### 에이전트 목록

| 에이전트 | 클래스 | 역할 |
|---------|--------|------|
| world_builder | WorldBuilder | 세계관 설정 → `bible/world.md` 생성 |
| character_designer | CharacterDesigner | 캐릭터 생성 → `bible/characters.md` 생성 |
| plot_architect | PlotArchitect | 플롯/챕터 구조 설계 |
| writer | Writer | 챕터 본문 집필 |
| editor | Editor | 일관성 검토 + 교정 |

## SSE 스트리밍

```
GET /api/phases/{phase_id}/run → SSE stream

event: agent_start
data: {"agent": "writer", "phase": "04_chapter_1"}

event: token
data: {"agent": "writer", "content": "첫 번째 문장..."}

event: agent_complete
data: {"agent": "writer", "phase": "04_chapter_1"}

event: phase_complete
data: {"phase": "04_chapter_1", "state": "completed"}

event: error
data: {"agent": "writer", "error": "API rate limit exceeded"}
```

Anthropic SDK `client.messages.stream()` → SSE 이벤트로 변환.

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/phases` | 전체 Phase 목록 + 상태 |
| GET | `/api/phases/{id}` | 특정 Phase 상태 |
| POST | `/api/phases/{id}/run` | Phase 실행 (SSE 응답) |
| GET | `/api/bible` | bible 파일 목록 + 내용 |
| GET | `/api/chapters` | 생성된 챕터 목록 |
| GET | `/api/chapters/{num}` | 특정 챕터 내용 |

## SQLite 스키마

```sql
CREATE TABLE phase_state (
    phase_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('pending','running','completed','failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result_summary TEXT
);

CREATE TABLE agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending','running','completed','failed')),
    input_context TEXT,
    output TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);

CREATE TABLE chapters (
    chapter_num INTEGER PRIMARY KEY,
    title TEXT,
    phase_id TEXT,
    content_path TEXT,
    word_count INTEGER,
    created_at TIMESTAMP,
    FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);
```

## 의존성

```
fastapi
uvicorn
anthropic
aiosqlite
pydantic
pydantic-settings
sse-starlette
python-dotenv
```

## 검증 방법

1. `uvicorn backend.main:app --reload`로 서버 기동
2. `GET /api/phases` — Phase 목록 반환 확인
3. `POST /api/phases/01_world_building/run` — SSE 스트림으로 에이전트 실행 확인
4. SQLite DB에 phase_state, agent_runs 기록 확인
5. `GET /api/bible` — bible 마크다운 읽기 확인
