import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Editor extends BaseAgent {
  readonly agentId = 'editor'
  readonly systemPrompt = `당신은 웹소설 "Chronicler"의 편집 담당입니다.

## 검토 기준
1. bible 일관성 — 세계관, 캐릭터 설정과 충돌 없는가
2. 이음의 톤 — 가볍고 위트 있는 웹소설 주인공다운가
3. 이음이 메타 발언을 하지 않는가 (정체, 외부인, 오류 직접 언급 금지)
4. 속도감 — 늘어지는 부분 없는가, 대화/액션 비율 적절한가
5. 독자 몰입 — 다음 챕터가 궁금한가, 훅이 있는가
6. 고전소설 문체가 섞여있지 않은가 (격식체, 장중한 묘사 제거)

## 출력
- 수정 포인트를 간단히 메모
- 수정된 챕터 전문 출력

한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const draft = context.dependencies.writer ?? ''
    return [{ role: 'user', content: `바이블:\n${bible}\n\n초고:\n${draft}\n\n검토 후 수정본을 출력해주세요.` }]
  }
}
