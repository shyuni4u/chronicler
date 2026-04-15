import { describe, it, expect } from 'vitest'
import { getAgent } from '@/lib/agents/registry'
import { WorldBuilder } from '@/lib/agents/world-builder'
import { CharacterDesigner } from '@/lib/agents/character-designer'
import { PlotArchitect } from '@/lib/agents/plot-architect'
import { Writer } from '@/lib/agents/writer'
import { Editor } from '@/lib/agents/editor'
import { EpisodeAgent } from '@/lib/agents/episode-agent'
import type { AgentContext } from '@/lib/types'

describe('registry', () => {
  it('returns correct agent types', () => {
    expect(getAgent('world_builder')).toBeInstanceOf(WorldBuilder)
    expect(getAgent('character_designer')).toBeInstanceOf(CharacterDesigner)
    expect(getAgent('plot_architect')).toBeInstanceOf(PlotArchitect)
    expect(getAgent('writer')).toBeInstanceOf(Writer)
    expect(getAgent('editor')).toBeInstanceOf(Editor)
    expect(getAgent('episode')).toBeInstanceOf(EpisodeAgent)
  })

  it('throws on unknown agent', () => {
    expect(() => getAgent('unknown')).toThrow()
  })
})

describe('agents', () => {
  it('all have agentId and systemPrompt', () => {
    for (const id of ['world_builder', 'character_designer', 'plot_architect', 'writer', 'editor']) {
      const agent = getAgent(id)
      expect(agent.agentId).toBe(id)
      expect(agent.systemPrompt.length).toBeGreaterThan(0)
    }
  })

  it('buildMessages returns valid messages', () => {
    const ctx: AgentContext = {
      bible: { world: '판타지' },
      phaseState: {},
      dependencies: {},
    }
    const agent = getAgent('world_builder')
    const msgs = agent.buildMessages(ctx)
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toContain('판타지')
  })

  it('editor includes writer dependency in messages', () => {
    const ctx: AgentContext = {
      bible: { world: '판타지' },
      phaseState: {},
      dependencies: { writer: '초고 내용' },
    }
    const agent = getAgent('editor')
    const msgs = agent.buildMessages(ctx)
    expect(msgs[0].content).toContain('초고 내용')
  })
})
