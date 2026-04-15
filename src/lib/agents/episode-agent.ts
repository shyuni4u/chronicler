import { claudePrompt } from '@/lib/claude-cli'
import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

const SUGGEST_SYSTEM = `당신은 소설 "Chronicler"의 에피소드 설계 전문가입니다.

세계관:
- 신화/전설/동화가 실제로 존재하는 세계
- 집단 기억 오염으로 각 이야기에 설정 오류 발생
- 주인공 이음이 결을 건너 오류를 발견하고 개입
- 해피엔딩 보장 없음

바이블을 기반으로 에피소드 후보 5개를 제안하세요.
각 카테고리에서 하나씩: 한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화

반드시 JSON만 반환. 다른 텍스트 없이.
형식:
{
  "episodes": [
    {
      "id": 1,
      "title": "에피소드 제목",
      "origin": "원전 이야기 이름",
      "culture": "문화권",
      "twist": "어긋난 설정 한 줄 요약",
      "mood": "에피소드 분위기",
      "hook": "이음이 처음 느끼는 이질감 한 줄 묘사"
    }
  ]
}`

const DETAIL_SYSTEM = `당신은 소설 "Chronicler"의 에피소드 설계 전문가입니다.

에피소드 상세 설계 원칙:
- 진입 순간: 이음이 결을 건너는 감각적 묘사
- 오류: 설정 하나가 어긋난 구체적 내용과 파장
- 영감의 순간: 이야기 흐름을 거스를 수 있는 결정적 순간
- 결말: 성공과 실패 모두 유효

반드시 JSON만 반환. 다른 텍스트 없이.
형식:
{
  "opening": "이음의 결 진입 묘사 2-3문장",
  "original": "원래 이야기 흐름 2-3문장",
  "error": "어긋난 설정과 파장 2-3문장",
  "inspiration_moment": "영감을 쓸 수 있는 순간 1-2문장",
  "possible_endings": ["결말 후보 1 (성공 또는 부분 성공)", "결말 후보 2 (실패 또는 씁쓸한 결말)"]
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
