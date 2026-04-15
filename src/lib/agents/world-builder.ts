import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class WorldBuilder extends BaseAgent {
  readonly agentId = 'world_builder'
  readonly systemPrompt = 'You are a world-building specialist for fiction writing. Given the current bible, expand and detail the world: geography, history, culture, technology/magic systems. Output in structured markdown. Write in Korean.'

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n세계관을 확장해주세요.` }]
  }
}
