import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

export class Writer extends BaseAgent {
  readonly agentId = 'writer'
  readonly systemPrompt = `당신은 소설 "Chronicler"의 집필 전문가입니다.

## 문체 원칙
- 잔잔하고 묵직한 성장 서사
- 이음의 시점 — 관찰이 먼저, 감정은 나중
- 과도한 설명 없이 독자가 스스로 느끼게
- 결을 건너는 장면은 감각적으로 묘사 (안개, 숲, 찰나)

## 이음의 목소리
- 말이 적다. 대화보다 관찰이 많다
- 기록하는 것이 본능 — 장면 안에서 무언가를 기억하려는 행동이 드러남
- 이 Domain의 사람들처럼 자연스럽게 녹아들지만 미묘한 이질감이 남음

## 금지 사항
- 이음이 자신이 외부에서 왔다고 직접 설명하게 하지 않는다
- 오류를 대사로 직접 설명하지 않는다
- 억지 희망이나 강제 해피엔딩 금지

바이블과 플롯을 엄격히 따르세요. 한국어로 작성하세요.`

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
