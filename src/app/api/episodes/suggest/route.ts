import { EpisodeAgent } from '@/lib/agents/episode-agent'
import { getBible } from '@/lib/server'
import { claudeStream, stripCodeFence, type StreamToken } from '@/lib/claude-cli'

export async function POST() {
  const bible = getBible()
  const agent = new EpisodeAgent()
  const encoder = new TextEncoder()

  const bibleText = Object.entries(bible.readAll()).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
  const prompt = `현재 바이블:\n${bibleText}\n\n에피소드 후보 5개를 JSON으로 제안해주세요.`
  const systemPrompt = 'You are an episode designer for a novel writing system. Given the current bible, suggest 5 episode candidates — one from each category: 한국 전래동화, 동아시아 신화, 서양 신화, 서양 동화, 중동/인도 설화. Each episode should have a unique twist (hook). Respond with valid JSON only. Write in Korean.'

  const stream = new ReadableStream({
    async start(controller) {
      const textParts: string[] = []
      let resultText = ''

      try {
        for await (const token of claudeStream(prompt, systemPrompt)) {
          if (token.type === 'thinking') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: token.content })}\n\n`)
            )
          } else if (token.type === 'text') {
            textParts.push(token.content)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', content: token.content })}\n\n`)
            )
          } else if (token.type === 'result') {
            resultText = token.content
          }
        }

        const raw = stripCodeFence(resultText || textParts.join(''))
        if (!raw) throw new Error('Empty response from Claude')
        const result = agent.normalizeSuggest(JSON.parse(raw))
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', result })}\n\n`)
        )
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
