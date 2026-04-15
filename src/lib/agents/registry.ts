import { BaseAgent } from './base'
import { WorldBuilder } from './world-builder'
import { CharacterDesigner } from './character-designer'
import { PlotArchitect } from './plot-architect'
import { Writer } from './writer'
import { Editor } from './editor'
import { EpisodeAgent } from './episode-agent'

const AGENTS: Record<string, new () => BaseAgent> = {
  world_builder: WorldBuilder,
  character_designer: CharacterDesigner,
  plot_architect: PlotArchitect,
  writer: Writer,
  editor: Editor,
  episode: EpisodeAgent,
}

export function getAgent(agentId: string): BaseAgent {
  const Cls = AGENTS[agentId]
  if (!Cls) throw new Error(`Unknown agent: ${agentId}`)
  return new Cls()
}
