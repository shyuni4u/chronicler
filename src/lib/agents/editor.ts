import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Editor extends BaseAgent {
  readonly agentId = 'editor'
  readonly systemPrompt = `당신은 웹소설 편집자입니다.

검토 기준:
1. 바이블과 충돌 없는가
2. 이음 톤 — 가볍고 위트 있는가, 메타 발언 없는가
3. 속도감 — 늘어지는 곳 없는가
4. 독자 몰입 — 다음 화 궁금한가
5. 고전소설 문체 섞여있지 않은가

출력:
- 수정 포인트 간단 메모
- 수정된 챕터 전문

한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const draft = context.dependencies.writer ?? ''
    return [{ role: 'user', content: `바이블:\n${bible}\n\n초고:\n${draft}\n\n검토 후 수정본을 출력해주세요.` }]
  }
}
