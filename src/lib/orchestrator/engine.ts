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
