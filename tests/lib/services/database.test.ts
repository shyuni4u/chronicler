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
