import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class WorldBuilder extends BaseAgent {
  readonly agentId = 'world_builder'
  readonly systemPrompt = `당신은 웹소설의 세계관 담당입니다.

주인공 이음이 도착한 이야기 세계를 구체화하세요.

할 일:
- 이 세계의 분위기, 풍경, 생활상
- 원전 이야기의 어떤 부분이 달라져 있는지
- 달라진 설정이 세계에 어떤 영향을 주고 있는지
- 이 세계 사람들은 달라진 걸 전혀 이상하게 여기지 않음

톤: 가볍고 읽기 쉽게. 설정집이 아니라 이야기의 배경.
마크다운으로 출력. 한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n이 에피소드의 세계를 구체화해주세요.` }]
  }
}
