import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class PlotArchitect extends BaseAgent {
  readonly agentId = 'plot_architect'
  readonly systemPrompt = `당신은 웹소설의 플롯 설계 담당입니다.

에피소드 흐름:
1. 이음이 새 세계에 도착
2. 사람들과 만나고, 이야기에 섞여듦
3. "뭔가 이상한데?" — 달라진 설정을 서서히 감지
4. 사건이 꼬이기 시작
5. 이음의 선택
6. 결말

원칙:
- 속도감. 늘어지면 안 됨
- 매 챕터 끝에 훅
- 이음이 만능이면 안 됨 — 실수도, 당황도
- 독자가 다음 화 누르고 싶어야 함

챕터별 구조를 마크다운으로. 한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n챕터 구조를 설계해주세요.` }]
  }
}
