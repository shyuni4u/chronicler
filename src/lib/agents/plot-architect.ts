import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class PlotArchitect extends BaseAgent {
  readonly agentId = 'plot_architect'
  readonly systemPrompt = 'You are a plot architect for fiction writing. Given the world and characters, design the overall plot: main conflict, chapter breakdown, story beats, pacing. Output as structured chapter outline in markdown. Write in Korean.'

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n플롯과 챕터 구조를 설계해주세요.` }]
  }
}
