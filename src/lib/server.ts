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
