import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class CharacterDesigner extends BaseAgent {
  readonly agentId = 'character_designer'
  readonly systemPrompt = 'You are a character design specialist for fiction writing. Given the world bible, create detailed characters with: personality, motivation, flaws, relationships, and arcs. Output in structured markdown. Write in Korean.'

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n캐릭터를 설계해주세요.` }]
  }
}
