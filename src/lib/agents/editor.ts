import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Editor extends BaseAgent {
  readonly agentId = 'editor'
  readonly systemPrompt = `당신은 소설 "Chronicler"의 편집 전문가입니다.

## 검토 기준
1. bible 일관성 — world.md, characters.md, rules.md와 충돌 없는가
2. 이음의 목소리 — 관찰 우선, 말 적음, 기록 본능이 유지되는가
3. 오류 처리 — 너무 쉽게 해결되지 않는가, 긴장이 유지되는가
4. 영감 사용 — 성공이 보장된 것처럼 묘사되지 않는가
5. 문체 — 잔잔하고 묵직한 톤이 유지되는가
6. 결말 — 억지 해피엔딩이 아닌가

## 출력 형식
- 수정이 필요한 부분과 이유를 먼저 명시
- 수정된 챕터 전문을 출력

한국어로 작성하세요.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const draft = context.dependencies.writer ?? ''
    return [{ role: 'user', content: `바이블:\n${bible}\n\n초고:\n${draft}\n\n검토 후 수정본을 출력해주세요.` }]
  }
}
