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
