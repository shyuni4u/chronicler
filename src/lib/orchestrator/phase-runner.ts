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

          for await (const token of agent.run(context)) {
            if (token.type === 'text') {
              collected.push(token.content)
              yield sseEvent('token', { agent: agentId, content: token.content })
            } else if (token.type === 'result') {
              collected.push(token.content)
            }
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
