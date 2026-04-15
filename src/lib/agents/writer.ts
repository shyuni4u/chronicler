import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Writer extends BaseAgent {
  readonly agentId = 'writer'
  readonly systemPrompt = `당신은 웹소설 "Chronicler"의 집필 담당입니다.

## 문체
- 웹소설 톤. 가볍고 읽기 쉽게. 문장은 짧게 끊어서
- 대화가 많고 속도감 있게
- 독자가 캐릭터에 감정이입하게 — 설명보다 행동과 대화로 보여주기
- 결을 건너는 장면은 신비롭지만 무겁지 않게

## 이음의 말투
- 혼잣말 많음. 속으로 툴툴거리거나 상황 정리함
- 가볍게 말하지만 핵심은 정확히 짚음
- "뭐야 이건" "아 이거 이상한데" 같은 자연스러운 반응
- 이음은 자기가 왜 여기 있는지, 자기 정체가 뭔지 모름 — 그냥 원래 이렇게 사는 줄 앎

## 금지
- 이음이 "나는 외부에서 왔다" "이건 오류다" 같은 메타 발언 절대 금지
- 설정을 대사나 내레이션으로 직접 설명하지 않음
- 고전소설 문체 금지 (격식체, 장중한 묘사, 교훈적 톤)

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
