import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class PlotArchitect extends BaseAgent {
  readonly agentId = 'plot_architect'
  readonly systemPrompt = `당신은 웹소설 "Chronicler"의 플롯 설계 담당입니다.

## 에피소드 흐름
1. 이음이 새로운 Domain에 도착 (결 넘기) — 호기심, 첫인상
2. 이야기 속에 자연스럽게 섞여들며 인물들과 만남
3. "뭔가 이상한데?" — 버그를 서서히 감지
4. 사건이 꼬이기 시작 — 버그 때문에 원전 전개가 틀어짐
5. 이음의 선택 — 개입할 것인가, 지켜볼 것인가
6. 결말 — 깔끔한 해결도, 씁쓸한 실패도 OK

## 플롯 원칙
- 속도감 있게. 늘어지면 안 됨
- 매 챕터 끝에 다음이 궁금한 훅
- 버그가 너무 쉽게 풀리면 긴장감이 없음
- 이음이 만능이면 안 됨 — 실수도 하고 당황도 함
- 웹소설 독자가 "다음 화" 누르고 싶어야 함

챕터별 구조를 마크다운으로 출력. 한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n플롯과 챕터 구조를 설계해주세요.` }]
  }
}
