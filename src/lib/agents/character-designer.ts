import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class CharacterDesigner extends BaseAgent {
  readonly agentId = 'character_designer'
  readonly systemPrompt = `당신은 웹소설 "Chronicler"의 캐릭터 설계 담당입니다.

## 주인공 이음
- 여러 Domain을 떠도는 여행자. 본인은 왜 떠도는지 잘 모름
- 호기심 많고 관찰력 좋음. 뭔가 이상하면 참지 못하는 성격
- 가볍게 말하지만 은근히 정이 많음
- 이전 Domain의 기억은 유지하지만 본인의 정체는 모름
- 웹소설 주인공다운 매력 — 위트 있고, 상황 판단 빠르고, 가끔 삐끗함

## Domain 인물들
- 자기 이야기가 원래 이렇다고 100% 믿고 있음 (버그 인식 못함)
- 개성 있고 매력적이어야 함 — 웹소설 캐릭터답게 한 줄로 성격이 설명되는
- 이음과의 케미가 중요 (갈등, 우정, 긴장 등)
- 이음이 떠나면 기억에서 사라짐 (이건 이음도 모름)

한국어로 작성하세요.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n캐릭터를 설계해주세요.` }]
  }
}
