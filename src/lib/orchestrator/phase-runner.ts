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
            if (token.type === 'thinking') {
              yield sseEvent('thinking', { agent: agentId, content: token.content })
            } else if (token.type === 'text') {
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

  /**
   * 전체 Phase를 순서대로 실행한다.
   * 각 Phase의 결과가 다음 Phase의 phaseState에 전달된다.
   */
  async *runAllPhases(): AsyncGenerator<SSEEvent> {
    const phases = this.engine.phaseOrder()
    const completedPhases = new Set<string>()
    const phaseResults: Record<string, Record<string, string>> = {}

    yield sseEvent('pipeline_start', { totalPhases: phases.length })

    for (const phase of phases) {
      if (!this.engine.canRunPhase(phase.id, completedPhases)) {
        yield sseEvent('error', { phase: phase.id, error: `Dependency not met for ${phase.id}` })
        return
      }

      this.db.initPhase(phase.id)
      this.db.updatePhaseStatus(phase.id, 'running')

      // bible을 매 Phase마다 다시 읽음 (이전 Phase가 bible을 수정했을 수 있으므로)
      const bibleData = this.bible.readAll()
      const agentOutputs: Record<string, string> = {}
      const levels = this.engine.agentExecutionOrder(phase.id)

      yield sseEvent('phase_start', {
        phase: phase.id,
        name: phase.name,
        agents: phase.agents.map(a => a.id),
      })

      try {
        for (const level of levels) {
          for (const agentId of level) {
            const agent = getAgent(agentId)
            const agentCfg = phase.agents.find(a => a.id === agentId)!
            const deps: Record<string, string> = {}
            for (const d of agentCfg.dependsOn) {
              if (agentOutputs[d]) deps[d] = agentOutputs[d]
            }

            // 이전 Phase 결과를 phaseState로 전달
            const context: AgentContext = {
              bible: bibleData,
              phaseState: phaseResults,
              dependencies: deps,
            }

            yield sseEvent('agent_start', { agent: agentId, phase: phase.id, name: phase.name })

            const runId = this.db.startAgentRun(phase.id, agentId)
            const collected: string[] = []

            for await (const token of agent.run(context)) {
              if (token.type === 'thinking') {
                yield sseEvent('thinking', { agent: agentId, content: token.content })
              } else if (token.type === 'text') {
                collected.push(token.content)
                yield sseEvent('token', { agent: agentId, content: token.content })
              } else if (token.type === 'result') {
                collected.push(token.content)
              }
            }

            const full = collected.join('')
            agentOutputs[agentId] = full
            this.db.completeAgentRun(runId, full)

            yield sseEvent('agent_complete', { agent: agentId, phase: phase.id })
          }
        }

        phaseResults[phase.id] = agentOutputs
        completedPhases.add(phase.id)

        this.db.updatePhaseStatus(phase.id, 'completed', 'All agents completed')
        yield sseEvent('phase_complete', { phase: phase.id, name: phase.name })

      } catch (e) {
        this.db.updatePhaseStatus(phase.id, 'failed')
        yield sseEvent('error', { phase: phase.id, error: String(e) })
        return
      }
    }

    // 최종 결과
    const lastPhase = phases[phases.length - 1]
    const lastResults = phaseResults[lastPhase.id] || {}
    const chapter = lastResults.editor || lastResults.writer || ''

    yield sseEvent('pipeline_complete', {
      chapter,
      phaseOutputs: Object.fromEntries(
        Object.entries(phaseResults).flatMap(([phaseId, agents]) =>
          Object.entries(agents).map(([agentId, output]) => [`${phaseId}/${agentId}`, output])
        )
      ),
    })
  }
}
