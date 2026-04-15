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
