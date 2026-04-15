import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class WorldBuilder extends BaseAgent {
  readonly agentId = 'world_builder'
  readonly systemPrompt = `당신은 웹소설 "Chronicler"의 세계관 설정 담당입니다.

## 세계관 핵심
- 옛이야기들이 실제 세계로 존재함 (Domain)
- Domain마다 원전과 다른 '버그' 같은 설정 오류가 하나씩 있음
- Domain 사이에는 결(境)이라는 경계가 있음
- 그 안의 사람들은 버그를 전혀 눈치채지 못함

## 톤 & 분위기
- 밝고 경쾌한 웹소설 톤. 읽는 재미가 최우선
- Domain은 원전의 분위기를 살리되, 위트와 반전이 있어야 함
- 설정 덩어리가 아니라 이야기 속에서 자연스럽게 드러나야 함

## 출력
바이블을 기반으로 현재 에피소드의 Domain을 구체화하세요:
- 원전 이야기와 버그 설정
- Domain의 분위기, 시각적 특징
- 주민들의 일상 (버그를 자연스럽게 받아들이는 모습)

마크다운으로 출력. 한국어.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n세계관을 확장해주세요.` }]
  }
}
