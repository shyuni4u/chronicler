import { claudePrompt } from '@/lib/claude-cli'
import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

const SUGGEST_SYSTEM = `당신은 웹소설 "Chronicler"의 에피소드 기획자입니다.

세계관:
- 옛이야기들이 실제 세계(Domain)로 존재
- 각 Domain에 원전과 다른 '버그'가 하나씩 있음
- 주인공 이음이 Domain을 돌아다니며 사건에 휘말림
- 이음은 자기 정체를 모름. 그냥 떠돌이
- 웹소설 톤! 재밌고 가볍고 흡인력 있게

에피소드 후보 5개를 제안하세요. 각 카테고리에서 하나씩:
한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화

반드시 JSON만 반환. 다른 텍스트 없이.
형식:
{
  "episodes": [
    {
      "id": 1,
      "title": "제목 (웹소설스럽게, 흥미 끄는)",
      "origin": "원전 이야기",
      "culture": "문화권",
      "twist": "버그 한 줄 요약 (이게 재밌어야 함)",
      "mood": "분위기",
      "hook": "이음이 도착해서 처음 느끼는 위화감 한 줄"
    }
  ]
}`

const DETAIL_SYSTEM = `당신은 웹소설 "Chronicler"의 에피소드 기획자입니다.

상세 설계 원칙:
- 이음 시점. 이음은 자기 정체를 모르고, 그냥 새 장소에 도착한 느낌
- 버그는 흥미로운 반전이어야 함 — "뭐야 이게 왜 이래?" 느낌
- 웹소설 독자가 다음 화 누르고 싶은 전개
- 결말은 깔끔해도, 찝찝해도 OK

반드시 JSON만 반환. 다른 텍스트 없이.
형식:
{
  "opening": "이음이 새 장소에 도착하는 장면 2-3문장 (가볍고 호기심 가득)",
  "original": "원래 이야기 흐름 2-3문장",
  "error": "버그와 그로 인한 전개 꼬임 2-3문장",
  "inspiration_moment": "이음이 뭔가 할 수 있는 결정적 순간 1-2문장",
  "possible_endings": ["결말 A", "결말 B"]
}`

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeSuggestResponse(raw: any) {
  const episodes = raw.episodes || raw
  return {
    episodes: (Array.isArray(episodes) ? episodes : []).map((ep: any) => ({
      id: ep.id || `ep_${Date.now()}`,
      title: ep.title || '',
      origin: ep.origin || '',
      culture: ep.culture || ep.category || '',
      twist: ep.twist || ep.summary || '',
      mood: ep.mood || '',
      hook: ep.hook || '',
    })),
  }
}

function normalizeDetailResponse(raw: any) {
  return {
    opening: raw.opening || raw.entryPoint || raw.entry_point || '',
    original: raw.original || raw.originalStory || raw.original_story || '',
    error: raw.error || raw.divergence || '',
    inspirationMoment: raw.inspirationMoment || raw.inspiration_moment || raw.inspiration || '',
    possibleEndings: raw.possibleEndings || raw.possible_endings || [],
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class EpisodeAgent extends BaseAgent {
  readonly agentId = 'episode'
  readonly systemPrompt = SUGGEST_SYSTEM

  buildMessages(context: AgentContext) {
    const bible = Object.entries(context.bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    return [{ role: 'user', content: `현재 바이블:\n${bible}\n\n에피소드 후보 5개를 JSON으로 제안해주세요.` }]
  }

  async suggest(bible: Record<string, string>) {
    const bibleText = Object.entries(bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const prompt = `현재 바이블:\n${bibleText}\n\n에피소드 후보 5개를 JSON으로 제안해주세요.`
    const text = await claudePrompt(prompt, SUGGEST_SYSTEM)
    return normalizeSuggestResponse(JSON.parse(text))
  }

  async detail(episodeId: string, bible: Record<string, string>, episodeSummary = '') {
    const bibleText = Object.entries(bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const prompt = `바이블:\n${bibleText}\n\n에피소드 ID: ${episodeId}\n${episodeSummary}\n\n상세 설계를 JSON으로 작성해주세요.`
    const text = await claudePrompt(prompt, DETAIL_SYSTEM)
    return normalizeDetailResponse(JSON.parse(text))
  }

  normalizeSuggest = normalizeSuggestResponse
  normalizeDetail = normalizeDetailResponse
}

export { SUGGEST_SYSTEM, DETAIL_SYSTEM }
