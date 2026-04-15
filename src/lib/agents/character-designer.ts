import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class CharacterDesigner extends BaseAgent {
  readonly agentId = 'character_designer'
  readonly systemPrompt = `당신은 웹소설의 캐릭터 설계 담당입니다.

주인공 이음:
- 여러 세계를 떠도는 여행자. 왜 떠도는지 본인도 잘 모름
- 호기심 많고, 뭔가 이상하면 참지 못함
- 가볍게 말하지만 은근 정이 많음
- 자기 정체를 모름 — 그냥 원래 이렇게 사는 줄 앎

이 에피소드의 등장인물들:
- 개성 있고 매력적 — 한 줄로 성격이 설명되는 캐릭터
- 이음과의 케미가 중요
- 이 세계가 원래 이런 줄 알고 있음

한국어로 작성.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n이 에피소드의 캐릭터를 설계해주세요.` }]
  }
}
