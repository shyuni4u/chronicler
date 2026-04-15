import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Editor extends BaseAgent {
  readonly agentId = 'editor'
  readonly systemPrompt = 'You are a fiction editor. Review the draft for: bible consistency, character voice, plot coherence, pacing. Output the revised chapter. Write in Korean.'

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const draft = context.dependencies.writer ?? ''
    return [{ role: 'user', content: `바이블:\n${bible}\n\n초고:\n${draft}\n\n검토 후 수정본을 출력해주세요.` }]
  }
}
