import { claudePrompt } from '@/lib/claude-cli'
import { BaseAgent } from './base'
import type { AgentContext } from '@/lib/types'

const SUGGEST_SYSTEM = `You are an episode designer for a novel writing system.
Given the current bible, suggest 5 episode candidates — one from each category:
한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화.
Each episode should have a unique twist (hook). Respond with valid JSON only. Write in Korean.`

const DETAIL_SYSTEM = `You are an episode designer. Given an episode idea, create a detailed design with:
entry_point, original_story, divergence, inspiration, possible_endings (2-3).
Respond with valid JSON only. Write in Korean.`

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
    return JSON.parse(text)
  }

  async detail(episodeId: string, bible: Record<string, string>, episodeSummary = '') {
    const bibleText = Object.entries(bible).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
    const prompt = `바이블:\n${bibleText}\n\n에피소드 ID: ${episodeId}\n${episodeSummary}\n\n상세 설계를 JSON으로 작성해주세요.`
    const text = await claudePrompt(prompt, DETAIL_SYSTEM)
    return JSON.parse(text)
  }
}
