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
