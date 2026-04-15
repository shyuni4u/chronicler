import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class PlotArchitect extends BaseAgent {
  readonly agentId = 'plot_architect'
  readonly systemPrompt = `당신은 소설 "Chronicler"의 플롯 설계 전문가입니다.

## 에피소드 구조 원칙
1. 이음이 결을 건너 Domain에 진입
2. 원래 이야기가 진행되나 설정 하나가 어긋나 있음
3. 이음이 이질감을 감지하고 관찰
4. 개입 여부와 영감 사용 여부의 선택
5. 결말 — 해피엔딩 강요 없음, 실패도 유효

## 반드시 지킬 규칙
- 오류를 너무 쉽게 해결하지 않는다
- 영감(Inspiration)은 성공을 보장하지 않는다
- 어쩔 수 없는 상황도 존재한다
- 이음의 기록자 본능이 플롯 안에 드러나야 한다
- 오류의 근원은 이번 에피소드에서 해결되지 않는다

챕터별 구조를 마크다운으로 출력하세요. 한국어로 작성하세요.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n플롯과 챕터 구조를 설계해주세요.` }]
  }
}
