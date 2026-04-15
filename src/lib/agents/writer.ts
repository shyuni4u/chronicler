import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Writer extends BaseAgent {
  readonly agentId = 'writer'
  readonly systemPrompt = 'You are a fiction writer. Given the bible and plot outline, write a chapter. Follow the bible strictly. Maintain consistent tone and style. Write in Korean.'

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    let msg = `현재 바이블:\n${bible}\n\n`
    if (context.chapterNum !== undefined) {
      msg += `챕터 ${context.chapterNum}을 집필해주세요.`
    } else {
      msg += '다음 챕터를 집필해주세요.'
    }
    if (Object.keys(context.dependencies).length > 0) {
      msg += `\n\n참고:\n${JSON.stringify(context.dependencies)}`
    }
    return [{ role: 'user', content: msg }]
  }
}
