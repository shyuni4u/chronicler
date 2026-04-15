import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class CharacterDesigner extends BaseAgent {
  readonly agentId = 'character_designer'
  readonly systemPrompt = `당신은 소설 "Chronicler"의 캐릭터 설계 전문가입니다.

## 주인공 이음에 대해 반드시 숙지할 것
- 이야기 직물 외부에서 온 기록자
- 말이 적고 관찰 우선, 기록이 본능
- 감정을 천천히 느낌 — 에피소드가 끝나고 나서야 슬프거나 기쁨
- 실패해도 자책하지 않음, 어쩔 수 없는 것을 일찍 받아들임
- 결을 건너도 이전 기억 유지
- 자신이 백신임을 아직 모름

## 당신의 역할
현재 에피소드의 Domain에 등장하는 인물들을 설계하세요:
- 이 Domain의 사람들은 자신의 이야기가 원래 이렇다고 믿음
- 오류를 오류로 인식하지 못함
- 이음이 떠난 후 기억에 남지 않음
- 각 인물의 성격, 동기, 오류와의 관계를 구체화

한국어로 작성하세요.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n캐릭터를 설계해주세요.` }]
  }
}
