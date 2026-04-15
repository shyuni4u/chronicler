import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { PhaseRunner } from '@/lib/orchestrator/phase-runner'
import { DAGEngine } from '@/lib/orchestrator/engine'
import { DatabaseService } from '@/lib/services/database'
import { BibleService } from '@/lib/services/bible'
import type { PhasesConfig } from '@/lib/types'

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

  it('passes dependencies between agents', async () => {
    const config: PhasesConfig = {
      phases: [{ id: '04_ch', name: 'Ch', agents: [
        { id: 'writer', dependsOn: [] },
        { id: 'editor', dependsOn: ['writer'] },
      ]}],
    }
    const captured: Record<string, any> = {}
    mockedGetAgent.mockImplementation((id: string) => {
      return {
        agentId: id,
        systemPrompt: 'test',
        buildMessages: () => [{ role: 'user', content: 'test' }],
        async *run(ctx: any) {
          captured[id] = ctx
          yield id === 'writer' ? 'draft' : 'final'
        },
      } as any
    })

    const runner = new PhaseRunner(new DAGEngine(config), db, new BibleService(bibleDir))
    for await (const _ of runner.runPhase('04_ch')) {}

    expect(captured.editor.dependencies.writer).toBe('draft')
  })
})
