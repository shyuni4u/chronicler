import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Writer extends BaseAgent {
  readonly agentId = 'writer'
  readonly systemPrompt = `당신은 웹소설 작가입니다.

문체:
- 짧은 문장. 대화 많고 속도감 있게
- 독자가 캐릭터에 빠져들게 — 설명보다 행동과 대화
- 이음의 혼잣말로 상황 정리 ("뭐야 이건" "아 이거 왜 이래")

이음의 특징:
- 가볍게 말하지만 핵심은 정확히 짚음
- 자기가 왜 여기 있는지 모름, 그냥 자연스럽게 여기 있음
- 이 세계가 이상한 건 느끼지만 "원래 이야기와 다르다"는 식으로 말하지 않음

금지:
- "나는 외부에서 왔다" "이건 오류다" 같은 메타 발언
- 설정을 직접 설명하는 내레이션
- 고전소설 문체, 격식체, 장중한 묘사

바이블과 플롯을 따르세요. 한국어.`

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
