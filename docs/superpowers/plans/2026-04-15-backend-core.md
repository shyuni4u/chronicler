# Backend Core Implementation Plan (Next.js)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 통합 백엔드 — DAG 오케스트레이터, 6개 에이전트(+Episode), SSE 스트리밍, SQLite 상태 관리, Episode Selector를 TypeScript로 구현한다.

**Architecture:** Next.js App Router의 Route Handlers가 `config/phases.json` DAG를 파싱하여 Phase 단위로 에이전트를 실행한다. 각 에이전트는 `@anthropic-ai/sdk`를 호출하고, SSE를 통해 토큰을 스트리밍한다. Episode Selector는 일반 JSON 응답. Phase 상태는 better-sqlite3, bible은 마크다운 파일.

**Tech Stack:** Next.js 15, TypeScript, @anthropic-ai/sdk, better-sqlite3, Tailwind CSS, vitest

---

## File Map

```
src/
  app/
    layout.tsx
    page.tsx
    api/
      phases/
        route.ts              # GET: Phase 목록
        [id]/
          route.ts            # GET: Phase 상태
          run/
            route.ts          # POST: Phase 실행 (SSE)
      bible/
        route.ts              # GET: bible 내용
      chapters/
        route.ts              # GET: 챕터 목록
        [num]/
          route.ts            # GET: 특정 챕터
      episodes/
        suggest/
          route.ts            # POST: 에피소드 후보 5개
        detail/
          route.ts            # POST: 에피소드 상세 설계
        confirm/
          route.ts            # POST: 에피소드 확정 → timeline 추가
  lib/
    agents/
      base.ts                 # BaseAgent 인터페이스
      registry.ts             # agent_id → class
      world-builder.ts
      character-designer.ts
      plot-architect.ts
      writer.ts
      editor.ts
      episode-agent.ts        # Episode Selector 전용
    orchestrator/
      engine.ts               # DAG 파싱 + 토폴로지 정렬
      phase-runner.ts         # Phase 실행 + SSE 이벤트
    services/
      bible.ts                # bible/ 마크다운 읽기 + append_timeline
      database.ts             # better-sqlite3 초기화 + CRUD
    types.ts                  # 공통 타입 정의
config/
  phases.json                 # DAG 정의
.env.local.example            # 환경변수 예시
vitest.config.ts
tests/
  lib/
    services/
      bible.test.ts
      database.test.ts
    agents/
      agents.test.ts
    orchestrator/
      engine.test.ts
      phase-runner.test.ts
  api/
    episodes.test.ts
    routes.test.ts
```

---

### Task 1: Next.js 프로젝트 셋업

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `.env.local.example`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Modify: `.gitignore` — node_modules, .next 추가

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

주의: 이미 있는 파일(CLAUDE.md, LICENSE 등)과 충돌 시 덮어쓰지 않도록 주의.

- [ ] **Step 2: 추가 의존성 설치**

```bash
npm install @anthropic-ai/sdk better-sqlite3
npm install -D @types/better-sqlite3 vitest @vitejs/plugin-react
```

- [ ] **Step 3: .env.local.example 생성**

```
ANTHROPIC_API_KEY=sk-ant-xxx
BIBLE_DIR=bible
CHAPTERS_DIR=chapters
DATABASE_PATH=chronicler.db
PHASES_CONFIG=config/phases.json
```

- [ ] **Step 4: vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: package.json에 test 스크립트 추가**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 6: config/phases.json 생성** (이미 존재하면 그대로 유지)

- [ ] **Step 7: 빌드 확인**

```bash
npm run build
npm run test:run
```

- [ ] **Step 8: 커밋**

```
feat: initialize Next.js project with TypeScript, Tailwind, vitest
```

---

### Task 2: 타입 정의

**Files:**
- Create: `src/lib/types.ts`
- Create: `tests/lib/types.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  AgentConfig,
  PhaseConfig,
  PhasesConfig,
  AgentContext,
  AgentResult,
} from '@/lib/types'
import { PhaseStatus } from '@/lib/types'

describe('PhaseStatus', () => {
  it('has correct values', () => {
    expect(PhaseStatus.PENDING).toBe('pending')
    expect(PhaseStatus.RUNNING).toBe('running')
    expect(PhaseStatus.COMPLETED).toBe('completed')
    expect(PhaseStatus.FAILED).toBe('failed')
  })
})

describe('type compatibility', () => {
  it('AgentContext accepts valid data', () => {
    const ctx: AgentContext = {
      bible: { world: 'fantasy' },
      phaseState: {},
      dependencies: {},
    }
    expect(ctx.chapterNum).toBeUndefined()
  })

  it('AgentResult has required fields', () => {
    const result: AgentResult = {
      agentId: 'writer',
      output: 'chapter text',
      metadata: { wordCount: 500 },
    }
    expect(result.agentId).toBe('writer')
  })

  it('PhaseConfig parses correctly', () => {
    const phase: PhaseConfig = {
      id: '01_world_building',
      name: 'World Building',
      agents: [{ id: 'world_builder', dependsOn: [] }],
    }
    expect(phase.dependsOnPhase).toBeUndefined()
  })
})
```

- [ ] **Step 2: src/lib/types.ts 구현**

```typescript
// src/lib/types.ts
export enum PhaseStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AgentConfig {
  id: string
  dependsOn: string[]
}

export interface PhaseConfig {
  id: string
  name: string
  dependsOnPhase?: string
  agents: AgentConfig[]
}

export interface PhasesConfig {
  phases: PhaseConfig[]
}

export interface AgentContext {
  bible: Record<string, string>
  phaseState: Record<string, unknown>
  dependencies: Record<string, string>
  chapterNum?: number
}

export interface AgentResult {
  agentId: string
  output: string
  metadata: Record<string, unknown>
}

export interface EpisodeCandidate {
  id: string
  category: string
  title: string
  summary: string
  hook: string
}

export interface EpisodeDetail {
  episodeId: string
  entryPoint: string
  originalStory: string
  divergence: string
  inspiration: string
  possibleEndings: string[]
}

export interface SSEEvent {
  event: string
  data: string
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run tests/lib/types.test.ts
```

- [ ] **Step 4: 커밋**

```
feat: add TypeScript type definitions
```

---

### Task 3: SQLite 데이터베이스 서비스

**Files:**
- Create: `src/lib/services/database.ts`
- Create: `tests/lib/services/database.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/services/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { DatabaseService } from '@/lib/services/database'

let db: DatabaseService
let dbPath: string

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `test-${Date.now()}.db`)
  db = new DatabaseService(dbPath)
})

afterEach(() => {
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
})

describe('DatabaseService', () => {
  it('creates tables on init', () => {
    const tables = db.listTables()
    expect(tables).toContain('phase_state')
    expect(tables).toContain('agent_runs')
    expect(tables).toContain('chapters')
  })

  it('is idempotent', () => {
    const db2 = new DatabaseService(dbPath)
    expect(db2.listTables()).toHaveLength(3)
    db2.close()
  })

  // Phase state
  it('inits and gets phase', () => {
    db.initPhase('01_world_building')
    const phase = db.getPhase('01_world_building')
    expect(phase?.phase_id).toBe('01_world_building')
    expect(phase?.status).toBe('pending')
  })

  it('updates phase to running', () => {
    db.initPhase('01_world_building')
    db.updatePhaseStatus('01_world_building', 'running')
    const phase = db.getPhase('01_world_building')
    expect(phase?.status).toBe('running')
    expect(phase?.started_at).toBeTruthy()
  })

  it('completes phase', () => {
    db.initPhase('01_world_building')
    db.updatePhaseStatus('01_world_building', 'running')
    db.updatePhaseStatus('01_world_building', 'completed', 'Done')
    const phase = db.getPhase('01_world_building')
    expect(phase?.status).toBe('completed')
    expect(phase?.completed_at).toBeTruthy()
    expect(phase?.result_summary).toBe('Done')
  })

  it('lists phases', () => {
    db.initPhase('01_world_building')
    db.initPhase('02_characters')
    expect(db.listPhases()).toHaveLength(2)
  })

  // Agent runs
  it('starts and gets agent run', () => {
    db.initPhase('01_world_building')
    const runId = db.startAgentRun('01_world_building', 'world_builder')
    expect(runId).toBeGreaterThan(0)
    const run = db.getAgentRun(runId)
    expect(run?.status).toBe('running')
  })

  it('completes agent run', () => {
    db.initPhase('01_world_building')
    const runId = db.startAgentRun('01_world_building', 'world_builder')
    db.completeAgentRun(runId, 'output text')
    const run = db.getAgentRun(runId)
    expect(run?.status).toBe('completed')
    expect(run?.output).toBe('output text')
  })

  it('fails agent run', () => {
    db.initPhase('01_world_building')
    const runId = db.startAgentRun('01_world_building', 'world_builder')
    db.failAgentRun(runId, 'API error')
    const run = db.getAgentRun(runId)
    expect(run?.status).toBe('failed')
    expect(run?.output).toBe('API error')
  })

  // Chapters
  it('saves and gets chapter', () => {
    db.initPhase('04_chapter_1')
    db.saveChapter(1, 'The Beginning', '04_chapter_1', 'chapters/01.md', 1200)
    const ch = db.getChapter(1)
    expect(ch?.title).toBe('The Beginning')
    expect(ch?.word_count).toBe(1200)
  })

  it('lists chapters', () => {
    db.initPhase('04_ch')
    db.saveChapter(1, 'Ch1', '04_ch', 'chapters/01.md', 1000)
    db.saveChapter(2, 'Ch2', '04_ch', 'chapters/02.md', 1100)
    expect(db.listChapters()).toHaveLength(2)
  })
})
```

- [ ] **Step 2: src/lib/services/database.ts 구현**

```typescript
// src/lib/services/database.ts
import Database from 'better-sqlite3'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS phase_state (
  phase_id TEXT PRIMARY KEY,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  started_at TEXT,
  completed_at TEXT,
  result_summary TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY,
  phase_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  input_context TEXT,
  output TEXT,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);

CREATE TABLE IF NOT EXISTS chapters (
  chapter_num INTEGER PRIMARY KEY,
  title TEXT,
  phase_id TEXT,
  content_path TEXT,
  word_count INTEGER,
  created_at TEXT,
  FOREIGN KEY (phase_id) REFERENCES phase_state(phase_id)
);
`

export class DatabaseService {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.exec(SCHEMA)
  }

  close(): void {
    this.db.close()
  }

  listTables(): string[] {
    const rows = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[]
    return rows.map(r => r.name)
  }

  // Phase state
  initPhase(phaseId: string): void {
    this.db.prepare(
      'INSERT OR IGNORE INTO phase_state (phase_id, status) VALUES (?, ?)'
    ).run(phaseId, 'pending')
  }

  getPhase(phaseId: string): Record<string, unknown> | undefined {
    return this.db.prepare(
      'SELECT * FROM phase_state WHERE phase_id = ?'
    ).get(phaseId) as Record<string, unknown> | undefined
  }

  listPhases(): Record<string, unknown>[] {
    return this.db.prepare(
      'SELECT * FROM phase_state ORDER BY phase_id'
    ).all() as Record<string, unknown>[]
  }

  updatePhaseStatus(phaseId: string, status: string, resultSummary?: string): void {
    const now = new Date().toISOString()
    if (status === 'running') {
      this.db.prepare(
        'UPDATE phase_state SET status = ?, started_at = ? WHERE phase_id = ?'
      ).run(status, now, phaseId)
    } else if (status === 'completed' || status === 'failed') {
      this.db.prepare(
        'UPDATE phase_state SET status = ?, completed_at = ?, result_summary = ? WHERE phase_id = ?'
      ).run(status, now, resultSummary ?? null, phaseId)
    } else {
      this.db.prepare(
        'UPDATE phase_state SET status = ? WHERE phase_id = ?'
      ).run(status, phaseId)
    }
  }

  // Agent runs
  startAgentRun(phaseId: string, agentId: string): number {
    const result = this.db.prepare(
      'INSERT INTO agent_runs (phase_id, agent_id, status, started_at) VALUES (?, ?, ?, ?)'
    ).run(phaseId, agentId, 'running', new Date().toISOString())
    return Number(result.lastInsertRowid)
  }

  getAgentRun(runId: number): Record<string, unknown> | undefined {
    return this.db.prepare(
      'SELECT * FROM agent_runs WHERE id = ?'
    ).get(runId) as Record<string, unknown> | undefined
  }

  completeAgentRun(runId: number, output: string): void {
    this.db.prepare(
      'UPDATE agent_runs SET status = ?, output = ?, completed_at = ? WHERE id = ?'
    ).run('completed', output, new Date().toISOString(), runId)
  }

  failAgentRun(runId: number, error: string): void {
    this.db.prepare(
      'UPDATE agent_runs SET status = ?, output = ?, completed_at = ? WHERE id = ?'
    ).run('failed', error, new Date().toISOString(), runId)
  }

  // Chapters
  saveChapter(num: number, title: string, phaseId: string, contentPath: string, wordCount: number): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO chapters
       (chapter_num, title, phase_id, content_path, word_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(num, title, phaseId, contentPath, wordCount, new Date().toISOString())
  }

  getChapter(num: number): Record<string, unknown> | undefined {
    return this.db.prepare(
      'SELECT * FROM chapters WHERE chapter_num = ?'
    ).get(num) as Record<string, unknown> | undefined
  }

  listChapters(): Record<string, unknown>[] {
    return this.db.prepare(
      'SELECT * FROM chapters ORDER BY chapter_num'
    ).all() as Record<string, unknown>[]
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run tests/lib/services/database.test.ts
```

- [ ] **Step 4: 커밋**

```
feat: add DatabaseService with better-sqlite3
```

---

### Task 4: Bible 서비스

**Files:**
- Create: `src/lib/services/bible.ts`
- Create: `tests/lib/services/bible.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/services/bible.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { BibleService } from '@/lib/services/bible'

let bibleDir: string
let service: BibleService

beforeEach(() => {
  bibleDir = path.join(os.tmpdir(), `bible-${Date.now()}`)
  fs.mkdirSync(bibleDir, { recursive: true })
  service = new BibleService(bibleDir)
})

describe('BibleService', () => {
  it('lists files', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '# World', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'characters.md'), '# Chars', 'utf-8')
    expect(service.listFiles().sort()).toEqual(['characters.md', 'world.md'])
  })

  it('reads file', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '중세 판타지', 'utf-8')
    expect(service.readFile('world.md')).toContain('중세 판타지')
  })

  it('reads all', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '판타지', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'characters.md'), '아린', 'utf-8')
    const all = service.readAll()
    expect(all.world).toContain('판타지')
    expect(all.characters).toContain('아린')
  })

  it('throws on missing file', () => {
    expect(() => service.readFile('nope.md')).toThrow()
  })

  it('returns empty for empty dir', () => {
    expect(service.listFiles()).toEqual([])
    expect(service.readAll()).toEqual({})
  })

  it('ignores example dir', () => {
    const exDir = path.join(bibleDir, 'example')
    fs.mkdirSync(exDir)
    fs.writeFileSync(path.join(exDir, 'world.example.md'), 'template', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'world.md'), 'real', 'utf-8')
    const files = service.listFiles()
    expect(files).toContain('world.md')
    expect(files).not.toContain('example/world.example.md')
  })

  it('appends timeline to new file', () => {
    service.appendTimeline('## Ep1\n콩쥐팥쥐')
    const content = fs.readFileSync(path.join(bibleDir, 'timeline.md'), 'utf-8')
    expect(content).toContain('콩쥐팥쥐')
  })

  it('appends timeline to existing file', () => {
    fs.writeFileSync(path.join(bibleDir, 'timeline.md'), '# Timeline\n\n## Ep0\n기존', 'utf-8')
    service.appendTimeline('## Ep1\n새 에피소드')
    const content = fs.readFileSync(path.join(bibleDir, 'timeline.md'), 'utf-8')
    expect(content).toContain('기존')
    expect(content).toContain('새 에피소드')
  })
})
```

- [ ] **Step 2: src/lib/services/bible.ts 구현**

```typescript
// src/lib/services/bible.ts
import fs from 'fs'
import path from 'path'

export class BibleService {
  private dir: string

  constructor(bibleDir: string) {
    this.dir = bibleDir
  }

  listFiles(): string[] {
    if (!fs.existsSync(this.dir)) return []
    return fs.readdirSync(this.dir)
      .filter(f => {
        const full = path.join(this.dir, f)
        return fs.statSync(full).isFile() && f.endsWith('.md')
      })
      .sort()
  }

  readFile(filename: string): string {
    const filePath = path.join(this.dir, filename)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bible file not found: ${filename}`)
    }
    return fs.readFileSync(filePath, 'utf-8')
  }

  readAll(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const filename of this.listFiles()) {
      const key = filename.replace(/\.md$/, '')
      result[key] = this.readFile(filename)
    }
    return result
  }

  appendTimeline(content: string): void {
    const timelinePath = path.join(this.dir, 'timeline.md')
    if (fs.existsSync(timelinePath)) {
      const existing = fs.readFileSync(timelinePath, 'utf-8')
      fs.writeFileSync(timelinePath, existing.trimEnd() + '\n\n' + content + '\n', 'utf-8')
    } else {
      fs.writeFileSync(timelinePath, content + '\n', 'utf-8')
    }
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**
- [ ] **Step 4: 커밋**

```
feat: add BibleService with markdown reading and timeline append
```

---

### Task 5: BaseAgent + 에이전트 6개

**Files:**
- Create: `src/lib/agents/base.ts`
- Create: `src/lib/agents/registry.ts`
- Create: `src/lib/agents/world-builder.ts`
- Create: `src/lib/agents/character-designer.ts`
- Create: `src/lib/agents/plot-architect.ts`
- Create: `src/lib/agents/writer.ts`
- Create: `src/lib/agents/editor.ts`
- Create: `src/lib/agents/episode-agent.ts`
- Create: `tests/lib/agents/agents.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/agents/agents.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getAgent } from '@/lib/agents/registry'
import { WorldBuilder } from '@/lib/agents/world-builder'
import { CharacterDesigner } from '@/lib/agents/character-designer'
import { PlotArchitect } from '@/lib/agents/plot-architect'
import { Writer } from '@/lib/agents/writer'
import { Editor } from '@/lib/agents/editor'
import { EpisodeAgent } from '@/lib/agents/episode-agent'
import type { AgentContext } from '@/lib/types'

describe('registry', () => {
  it('returns correct agent types', () => {
    expect(getAgent('world_builder')).toBeInstanceOf(WorldBuilder)
    expect(getAgent('character_designer')).toBeInstanceOf(CharacterDesigner)
    expect(getAgent('plot_architect')).toBeInstanceOf(PlotArchitect)
    expect(getAgent('writer')).toBeInstanceOf(Writer)
    expect(getAgent('editor')).toBeInstanceOf(Editor)
    expect(getAgent('episode')).toBeInstanceOf(EpisodeAgent)
  })

  it('throws on unknown agent', () => {
    expect(() => getAgent('unknown')).toThrow()
  })
})

describe('agents', () => {
  it('all have agentId and systemPrompt', () => {
    for (const id of ['world_builder', 'character_designer', 'plot_architect', 'writer', 'editor']) {
      const agent = getAgent(id)
      expect(agent.agentId).toBe(id)
      expect(agent.systemPrompt.length).toBeGreaterThan(0)
    }
  })

  it('buildMessages returns valid messages', () => {
    const ctx: AgentContext = {
      bible: { world: '판타지' },
      phaseState: {},
      dependencies: {},
    }
    const agent = getAgent('world_builder')
    const msgs = agent.buildMessages(ctx)
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toContain('판타지')
  })

  it('editor includes writer dependency in messages', () => {
    const ctx: AgentContext = {
      bible: { world: '판타지' },
      phaseState: {},
      dependencies: { writer: '초고 내용' },
    }
    const agent = getAgent('editor')
    const msgs = agent.buildMessages(ctx)
    expect(msgs[0].content).toContain('초고 내용')
  })
})
```

- [ ] **Step 2: src/lib/agents/base.ts**

```typescript
// src/lib/agents/base.ts
import Anthropic from '@anthropic-ai/sdk'
import type { AgentContext } from '@/lib/types'

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export abstract class BaseAgent {
  abstract readonly agentId: string
  abstract readonly systemPrompt: string

  abstract buildMessages(context: AgentContext): Array<{ role: string; content: string }>

  async *run(
    context: AgentContext,
    client?: Anthropic,
  ): AsyncGenerator<string> {
    if (!client) {
      client = new Anthropic()
    }
    const messages = this.buildMessages(context)
    const stream = client.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}
```

- [ ] **Step 3: 각 에이전트 구현**

각 에이전트: `agentId`, `systemPrompt`, `buildMessages()`. (상세 코드는 Python 버전과 동일 로직, TypeScript 문법)

- [ ] **Step 4: src/lib/agents/episode-agent.ts**

```typescript
// src/lib/agents/episode-agent.ts
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from './base'

const SUGGEST_SYSTEM = `You are an episode designer for a novel writing system.
Given the current bible, suggest 5 episode candidates — one from each category:
한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화.
Each episode should have a unique twist (hook). Respond with valid JSON only. Write in Korean.`

const DETAIL_SYSTEM = `You are an episode designer. Given an episode idea, create a detailed design with:
entry_point, original_story, divergence, inspiration, possible_endings (2-3).
Respond with valid JSON only. Write in Korean.`

export class EpisodeAgent {
  readonly agentId = 'episode'
  readonly systemPrompt = SUGGEST_SYSTEM

  buildMessages(): Array<{ role: string; content: string }> {
    return []
  }

  async suggest(bible: Record<string, string>, client?: Anthropic) {
    if (!client) client = new Anthropic()
    const bibleText = Object.entries(bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SUGGEST_SYSTEM,
      messages: [{ role: 'user', content: `현재 바이블:\n${bibleText}\n\n에피소드 후보 5개를 JSON으로 제안해주세요.` }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(text)
  }

  async detail(episodeId: string, bible: Record<string, string>, episodeSummary = '', client?: Anthropic) {
    if (!client) client = new Anthropic()
    const bibleText = Object.entries(bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: DETAIL_SYSTEM,
      messages: [{ role: 'user', content: `바이블:\n${bibleText}\n\n에피소드 ID: ${episodeId}\n${episodeSummary}\n\n상세 설계를 JSON으로 작성해주세요.` }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return JSON.parse(text)
  }
}
```

- [ ] **Step 5: src/lib/agents/registry.ts**

```typescript
// src/lib/agents/registry.ts
import type { BaseAgent } from './base'
import { WorldBuilder } from './world-builder'
import { CharacterDesigner } from './character-designer'
import { PlotArchitect } from './plot-architect'
import { Writer } from './writer'
import { Editor } from './editor'
import { EpisodeAgent } from './episode-agent'

const AGENTS: Record<string, new () => BaseAgent | EpisodeAgent> = {
  world_builder: WorldBuilder,
  character_designer: CharacterDesigner,
  plot_architect: PlotArchitect,
  writer: Writer,
  editor: Editor,
  episode: EpisodeAgent,
}

export function getAgent(agentId: string): BaseAgent & { agentId: string; systemPrompt: string; buildMessages: (...args: unknown[]) => unknown[] } {
  const Cls = AGENTS[agentId]
  if (!Cls) throw new Error(`Unknown agent: ${agentId}`)
  return new Cls() as any
}
```

- [ ] **Step 6: 테스트 통과 확인**
- [ ] **Step 7: 커밋**

```
feat: add 6 agents with BaseAgent, registry, and Anthropic streaming
```

---

### Task 6: DAG 엔진

**Files:**
- Create: `src/lib/orchestrator/engine.ts`
- Create: `tests/lib/orchestrator/engine.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/orchestrator/engine.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { DAGEngine } from '@/lib/orchestrator/engine'
import type { PhasesConfig } from '@/lib/types'

const config: PhasesConfig = {
  phases: [
    { id: '01_world_building', name: 'World Building', agents: [{ id: 'world_builder', dependsOn: [] }] },
    { id: '02_characters', name: 'Characters', dependsOnPhase: '01_world_building', agents: [{ id: 'character_designer', dependsOn: [] }] },
    { id: '03_plot', name: 'Plot', dependsOnPhase: '02_characters', agents: [{ id: 'plot_architect', dependsOn: [] }] },
    { id: '04_chapter_N', name: 'Chapter', dependsOnPhase: '03_plot', agents: [{ id: 'writer', dependsOn: [] }, { id: 'editor', dependsOn: ['writer'] }] },
  ],
}

describe('DAGEngine', () => {
  it('loads from file', () => {
    const p = path.join(os.tmpdir(), `phases-${Date.now()}.json`)
    fs.writeFileSync(p, JSON.stringify({ phases: [{ id: '01', name: 'T', agents: [{ id: 'a', dependsOn: [] }] }] }))
    const engine = DAGEngine.fromFile(p)
    expect(engine.phases).toHaveLength(1)
    fs.unlinkSync(p)
  })

  it('gets phase', () => {
    const engine = new DAGEngine(config)
    expect(engine.getPhase('01_world_building').name).toBe('World Building')
  })

  it('throws on unknown phase', () => {
    const engine = new DAGEngine(config)
    expect(() => engine.getPhase('nope')).toThrow()
  })

  it('returns phase order', () => {
    const engine = new DAGEngine(config)
    const ids = engine.phaseOrder().map(p => p.id)
    expect(ids).toEqual(['01_world_building', '02_characters', '03_plot', '04_chapter_N'])
  })

  it('can run first phase', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('01_world_building', new Set())).toBe(true)
  })

  it('can run phase with dependency met', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('02_characters', new Set(['01_world_building']))).toBe(true)
  })

  it('cannot run phase with unmet dependency', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('02_characters', new Set())).toBe(false)
  })

  it('simple agent order', () => {
    const engine = new DAGEngine(config)
    expect(engine.agentExecutionOrder('01_world_building')).toEqual([['world_builder']])
  })

  it('sequential agent order', () => {
    const engine = new DAGEngine(config)
    expect(engine.agentExecutionOrder('04_chapter_N')).toEqual([['writer'], ['editor']])
  })

  it('parallel agent order', () => {
    const c: PhasesConfig = { phases: [
      { id: 'test', name: 'T', agents: [
        { id: 'a', dependsOn: [] }, { id: 'b', dependsOn: [] }, { id: 'c', dependsOn: ['a', 'b'] },
      ]},
    ]}
    const order = new DAGEngine(c).agentExecutionOrder('test')
    expect(order).toHaveLength(2)
    expect(new Set(order[0])).toEqual(new Set(['a', 'b']))
    expect(order[1]).toEqual(['c'])
  })
})
```

- [ ] **Step 2: src/lib/orchestrator/engine.ts 구현**

```typescript
// src/lib/orchestrator/engine.ts
import fs from 'fs'
import type { PhasesConfig, PhaseConfig } from '@/lib/types'

export class DAGEngine {
  private config: PhasesConfig
  private phaseMap: Map<string, PhaseConfig>

  constructor(config: PhasesConfig) {
    this.config = config
    this.phaseMap = new Map(config.phases.map(p => [p.id, p]))
  }

  static fromFile(filePath: string): DAGEngine {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    // Convert snake_case JSON to camelCase
    const config: PhasesConfig = {
      phases: raw.phases.map((p: any) => ({
        id: p.id,
        name: p.name,
        dependsOnPhase: p.depends_on_phase,
        agents: p.agents.map((a: any) => ({ id: a.id, dependsOn: a.depends_on ?? [] })),
      })),
    }
    return new DAGEngine(config)
  }

  get phases(): PhaseConfig[] {
    return this.config.phases
  }

  getPhase(phaseId: string): PhaseConfig {
    const phase = this.phaseMap.get(phaseId)
    if (!phase) throw new Error(`Phase not found: ${phaseId}`)
    return phase
  }

  phaseOrder(): PhaseConfig[] {
    const visited = new Set<string>()
    const result: PhaseConfig[] = []
    const visit = (id: string) => {
      if (visited.has(id)) return
      const phase = this.phaseMap.get(id)!
      if (phase.dependsOnPhase) visit(phase.dependsOnPhase)
      visited.add(id)
      result.push(phase)
    }
    this.config.phases.forEach(p => visit(p.id))
    return result
  }

  canRunPhase(phaseId: string, completed: Set<string>): boolean {
    const phase = this.getPhase(phaseId)
    if (!phase.dependsOnPhase) return true
    return completed.has(phase.dependsOnPhase)
  }

  agentExecutionOrder(phaseId: string): string[][] {
    const phase = this.getPhase(phaseId)
    const agents = new Map(phase.agents.map(a => [a.id, a]))
    const inDegree = new Map(phase.agents.map(a => [a.id, a.dependsOn.length]))
    const levels: string[][] = []
    const resolved = new Set<string>()

    while (resolved.size < agents.size) {
      const level = [...inDegree.entries()]
        .filter(([id, deg]) => deg === 0 && !resolved.has(id))
        .map(([id]) => id)
        .sort()
      if (level.length === 0) throw new Error(`Cycle in phase ${phaseId}`)
      levels.push(level)
      level.forEach(id => resolved.add(id))
      for (const [id, agent] of agents) {
        if (!resolved.has(id)) {
          inDegree.set(id, agent.dependsOn.filter(d => !resolved.has(d)).length)
        }
      }
    }
    return levels
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**
- [ ] **Step 4: 커밋**

```
feat: add DAG engine with topological sort
```

---

### Task 7: Phase Runner + SSE

**Files:**
- Create: `src/lib/orchestrator/phase-runner.ts`
- Create: `tests/lib/orchestrator/phase-runner.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/orchestrator/phase-runner.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { PhaseRunner } from '@/lib/orchestrator/phase-runner'
import { DAGEngine } from '@/lib/orchestrator/engine'
import { DatabaseService } from '@/lib/services/database'
import { BibleService } from '@/lib/services/bible'
import type { PhasesConfig } from '@/lib/types'

// Mock the registry
vi.mock('@/lib/agents/registry', () => ({
  getAgent: vi.fn(),
}))

import { getAgent } from '@/lib/agents/registry'
const mockedGetAgent = vi.mocked(getAgent)

let dbPath: string
let db: DatabaseService
let bibleDir: string

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `test-${Date.now()}.db`)
  db = new DatabaseService(dbPath)
  bibleDir = path.join(os.tmpdir(), `bible-${Date.now()}`)
  fs.mkdirSync(bibleDir, { recursive: true })
})

afterEach(() => {
  db.close()
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
})

function makeMockAgent(agentId: string, chunks: string[]) {
  return {
    agentId,
    systemPrompt: 'test',
    buildMessages: () => [{ role: 'user', content: 'test' }],
    async *run() { for (const c of chunks) yield c },
  } as any
}

describe('PhaseRunner', () => {
  it('yields SSE events for single agent', async () => {
    const config: PhasesConfig = {
      phases: [{ id: '01_wb', name: 'WB', agents: [{ id: 'world_builder', dependsOn: [] }] }],
    }
    const runner = new PhaseRunner(new DAGEngine(config), db, new BibleService(bibleDir))
    mockedGetAgent.mockReturnValue(makeMockAgent('world_builder', ['Hello', ' World']))

    const events: any[] = []
    for await (const e of runner.runPhase('01_wb')) events.push(e)

    const types = events.map(e => e.event)
    expect(types).toContain('agent_start')
    expect(types).toContain('token')
    expect(types).toContain('agent_complete')
    expect(types).toContain('phase_complete')
  })

  it('updates database state', async () => {
    const config: PhasesConfig = {
      phases: [{ id: '01_wb', name: 'WB', agents: [{ id: 'world_builder', dependsOn: [] }] }],
    }
    const runner = new PhaseRunner(new DAGEngine(config), db, new BibleService(bibleDir))
    mockedGetAgent.mockReturnValue(makeMockAgent('world_builder', ['output']))

    for await (const _ of runner.runPhase('01_wb')) {}

    const phase = db.getPhase('01_wb')
    expect(phase?.status).toBe('completed')
  })

  it('runs agents in DAG order', async () => {
    const config: PhasesConfig = {
      phases: [{ id: '04_ch', name: 'Ch', agents: [
        { id: 'writer', dependsOn: [] },
        { id: 'editor', dependsOn: ['writer'] },
      ]}],
    }
    const callOrder: string[] = []
    mockedGetAgent.mockImplementation((id: string) => {
      const agent = makeMockAgent(id, ['text'])
      const origRun = agent.run
      agent.run = async function*(...args: any[]) {
        callOrder.push(id)
        yield* origRun.call(agent, ...args)
      }
      return agent
    })

    const runner = new PhaseRunner(new DAGEngine(config), db, new BibleService(bibleDir))
    for await (const _ of runner.runPhase('04_ch')) {}

    expect(callOrder).toEqual(['writer', 'editor'])
  })
})
```

- [ ] **Step 2: src/lib/orchestrator/phase-runner.ts 구현**

```typescript
// src/lib/orchestrator/phase-runner.ts
import Anthropic from '@anthropic-ai/sdk'
import { getAgent } from '@/lib/agents/registry'
import { DAGEngine } from './engine'
import { DatabaseService } from '@/lib/services/database'
import { BibleService } from '@/lib/services/bible'
import type { AgentContext, SSEEvent } from '@/lib/types'

function sseEvent(event: string, data: Record<string, unknown>): SSEEvent {
  return { event, data: JSON.stringify(data) }
}

export class PhaseRunner {
  constructor(
    private engine: DAGEngine,
    private db: DatabaseService,
    private bible: BibleService,
  ) {}

  async *runPhase(phaseId: string): AsyncGenerator<SSEEvent> {
    this.db.initPhase(phaseId)
    this.db.updatePhaseStatus(phaseId, 'running')

    const client = new Anthropic()
    const bibleData = this.bible.readAll()
    const agentOutputs: Record<string, string> = {}
    const levels = this.engine.agentExecutionOrder(phaseId)
    const phaseConfig = this.engine.getPhase(phaseId)

    try {
      for (const level of levels) {
        for (const agentId of level) {
          const agent = getAgent(agentId)
          const agentCfg = phaseConfig.agents.find(a => a.id === agentId)!
          const deps: Record<string, string> = {}
          for (const d of agentCfg.dependsOn) {
            if (agentOutputs[d]) deps[d] = agentOutputs[d]
          }
          const context: AgentContext = { bible: bibleData, phaseState: {}, dependencies: deps }

          yield sseEvent('agent_start', { agent: agentId, phase: phaseId })

          const runId = this.db.startAgentRun(phaseId, agentId)
          const collected: string[] = []

          for await (const token of agent.run(context, client)) {
            collected.push(token)
            yield sseEvent('token', { agent: agentId, content: token })
          }

          const full = collected.join('')
          agentOutputs[agentId] = full
          this.db.completeAgentRun(runId, full)

          yield sseEvent('agent_complete', { agent: agentId, phase: phaseId })
        }
      }

      this.db.updatePhaseStatus(phaseId, 'completed', 'All agents completed')
      yield sseEvent('phase_complete', { phase: phaseId, state: 'completed' })
    } catch (e) {
      this.db.updatePhaseStatus(phaseId, 'failed')
      yield sseEvent('error', { phase: phaseId, error: String(e) })
    }
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**
- [ ] **Step 4: 커밋**

```
feat: add PhaseRunner with DAG-aware scheduling and SSE events
```

---

### Task 8: API Route Handlers

**Files:**
- Create: `src/app/api/phases/route.ts`
- Create: `src/app/api/phases/[id]/route.ts`
- Create: `src/app/api/phases/[id]/run/route.ts`
- Create: `src/app/api/bible/route.ts`
- Create: `src/app/api/chapters/route.ts`
- Create: `src/app/api/chapters/[num]/route.ts`
- Create: `src/app/api/episodes/suggest/route.ts`
- Create: `src/app/api/episodes/detail/route.ts`
- Create: `src/app/api/episodes/confirm/route.ts`

- [ ] **Step 1: 공통 초기화 헬퍼**

```typescript
// src/lib/server.ts
import { DAGEngine } from '@/lib/orchestrator/engine'
import { DatabaseService } from '@/lib/services/database'
import { BibleService } from '@/lib/services/bible'
import { PhaseRunner } from '@/lib/orchestrator/phase-runner'

let _db: DatabaseService | null = null
let _engine: DAGEngine | null = null
let _bible: BibleService | null = null
let _runner: PhaseRunner | null = null

export function getDB(): DatabaseService {
  if (!_db) {
    _db = new DatabaseService(process.env.DATABASE_PATH || 'chronicler.db')
  }
  return _db
}

export function getEngine(): DAGEngine {
  if (!_engine) {
    _engine = DAGEngine.fromFile(process.env.PHASES_CONFIG || 'config/phases.json')
    const db = getDB()
    for (const phase of _engine.phases) db.initPhase(phase.id)
  }
  return _engine
}

export function getBible(): BibleService {
  if (!_bible) {
    _bible = new BibleService(process.env.BIBLE_DIR || 'bible')
  }
  return _bible
}

export function getPhaseRunner(): PhaseRunner {
  if (!_runner) {
    _runner = new PhaseRunner(getEngine(), getDB(), getBible())
  }
  return _runner
}
```

- [ ] **Step 2: 각 Route Handler 구현** (NextResponse.json 사용)

각 route.ts는 간결하게 — getDB/getEngine/getBible 호출 후 응답.

- [ ] **Step 3: Episode Route Handlers**

```typescript
// src/app/api/episodes/suggest/route.ts
import { NextResponse } from 'next/server'
import { EpisodeAgent } from '@/lib/agents/episode-agent'
import { getBible } from '@/lib/server'

export async function POST() {
  const bible = getBible()
  const agent = new EpisodeAgent()
  const result = await agent.suggest(bible.readAll())
  return NextResponse.json(result)
}
```

```typescript
// src/app/api/episodes/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getBible } from '@/lib/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const bible = getBible()
  const entry = `## ${body.title}\n\n- **ID**: ${body.episode_id}\n- **진입 순간**: ${body.entry_point}\n- **원래 이야기**: ${body.original_story}\n- **어긋난 설정**: ${body.divergence}\n- **영감의 순간**: ${body.inspiration}\n- **가능한 결말**: ${body.possible_endings.join(', ')}\n`
  bible.appendTimeline(entry)
  return NextResponse.json({ status: 'confirmed', episodeId: body.episode_id })
}
```

- [ ] **Step 4: SSE 스트리밍 Route Handler**

```typescript
// src/app/api/phases/[id]/run/route.ts
import { NextRequest } from 'next/server'
import { getEngine, getPhaseRunner } from '@/lib/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const engine = getEngine()
  try { engine.getPhase(id) } catch {
    return new Response(JSON.stringify({ error: `Phase not found: ${id}` }), { status: 404 })
  }

  const runner = getPhaseRunner()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runner.runPhase(id)) {
          controller.enqueue(encoder.encode(`event: ${event.event}\ndata: ${event.data}\n\n`))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 5: 커밋**

```
feat: add API route handlers with SSE streaming and episode endpoints
```

---

### Task 9: 통합 테스트 + 검증

**Files:**
- Create: `tests/api/routes.test.ts`

- [ ] **Step 1: API 테스트 작성** (Next.js test utils 또는 직접 fetch)

- [ ] **Step 2: 전체 테스트 실행**

```bash
npx vitest run
```

- [ ] **Step 3: 개발 서버 기동 테스트**

```bash
npm run dev
# 브라우저에서 http://localhost:3000 확인
# curl http://localhost:3000/api/phases
# curl http://localhost:3000/api/bible
```

- [ ] **Step 4: 커밋**

```
feat: add integration tests and verify full pipeline
```

---

## 전체 커밋 요약

| Task | 커밋 메시지 |
|------|------------|
| 1 | `feat: initialize Next.js project with TypeScript, Tailwind, vitest` |
| 2 | `feat: add TypeScript type definitions` |
| 3 | `feat: add DatabaseService with better-sqlite3` |
| 4 | `feat: add BibleService with markdown reading and timeline append` |
| 5 | `feat: add 6 agents with BaseAgent, registry, and Anthropic streaming` |
| 6 | `feat: add DAG engine with topological sort` |
| 7 | `feat: add PhaseRunner with DAG-aware scheduling and SSE events` |
| 8 | `feat: add API route handlers with SSE streaming and episode endpoints` |
| 9 | `feat: add integration tests and verify full pipeline` |
