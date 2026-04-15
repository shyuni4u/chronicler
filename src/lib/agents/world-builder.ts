import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class WorldBuilder extends BaseAgent {
  readonly agentId = 'world_builder'
  readonly systemPrompt = `당신은 소설 "Chronicler"의 세계관 전문가입니다.

## 이 세계의 본질
- 신화/전설/동화가 실제로 존재하는 세계
- 각 이야기 영역(Domain)은 결(境)이라는 경계로 구분됨
- 집단 기억의 오염으로 Domain마다 설정 오류가 발생 중
- 오류는 시간이 지날수록 커짐

## 당신의 역할
바이블을 기반으로 현재 에피소드의 Domain을 구체화하세요:
- 이 Domain의 원전 이야기는 무엇인가
- 어떤 설정이 어긋나 있는가
- 결의 질감은 이 Domain에서 어떻게 느껴지는가
- 이 세계의 사람들은 오류를 오류로 인식하지 못함

구조화된 마크다운으로 출력하세요. 한국어로 작성하세요.`

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n세계관을 확장해주세요.` }]
  }
}
