import { claudePrompt } from '@/lib/claude-cli'
import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

const SUGGEST_SYSTEM = `당신은 웹소설 에피소드 기획자입니다.

주인공 이음은 여러 세계를 떠도는 여행자입니다. 매번 옛이야기 속 세계에 도착하는데, 거기엔 항상 뭔가 하나가 원전과 달라요. 이음은 그걸 눈치채고 사건에 휘말립니다.

에피소드 후보 5개를 제안하세요.
각 카테고리에서 하나씩: 한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화

중요:
- 제목은 웹소설처럼 흥미를 끌어야 함
- twist가 핵심 — "원전이랑 뭐가 다른지"가 재밌어야 함
- 무겁지 않게, 읽고 싶게

반드시 JSON만 반환.
{
  "episodes": [
    {
      "id": 1,
      "title": "웹소설스러운 제목",
      "origin": "원전 이름",
      "culture": "문화권",
      "twist": "뭐가 달라졌는지 한 줄",
      "mood": "분위기 한 단어",
      "hook": "이음이 도착해서 '어?' 하는 순간 한 줄"
    }
  ]
}`

const DETAIL_SYSTEM = `당신은 웹소설 에피소드 기획자입니다.

선택된 에피소드를 상세하게 설계하세요.

원칙:
- 이음 시점. 새로운 곳에 도착한 여행자의 느낌
- twist가 이야기를 어떻게 꼬이게 만드는지
- 독자가 다음 화를 누르고 싶어야 함
- 가볍고 재밌게

반드시 JSON만 반환.
{
  "opening": "이음이 도착하는 장면 2-3문장",
  "original": "원래 이야기 흐름 2-3문장",
  "error": "뭐가 달라졌고 어떻게 꼬이는지 2-3문장",
  "inspiration_moment": "이음이 뭔가 할 수 있는 순간 1-2문장",
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
    const prompt = `바이블:\n${bibleText}\n\n에피소드: ${episodeId}\n${episodeSummary}\n\n상세 설계를 JSON으로.`
    const text = await claudePrompt(prompt, DETAIL_SYSTEM)
    return normalizeDetailResponse(JSON.parse(text))
  }

  normalizeSuggest = normalizeSuggestResponse
  normalizeDetail = normalizeDetailResponse
}

export { SUGGEST_SYSTEM, DETAIL_SYSTEM }
