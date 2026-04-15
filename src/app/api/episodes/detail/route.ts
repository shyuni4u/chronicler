import { NextRequest } from 'next/server'
import { EpisodeAgent, DETAIL_SYSTEM } from '@/lib/agents/episode-agent'
import { getBible } from '@/lib/server'
import { claudeStream, stripCodeFence } from '@/lib/claude-cli'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const bible = getBible()
  const agent = new EpisodeAgent()
  const encoder = new TextEncoder()

  const bibleText = Object.entries(bible.readAll()).map(([k, v]) => `## ${k}\n${v}`).join('\n\n')
  const prompt = `바이블:\n${bibleText}\n\n에피소드 ID: ${body.episode_id}\n${body.episode_summary ?? ''}\n\n상세 설계를 JSON으로 작성해주세요.`

  const stream = new ReadableStream({
    async start(controller) {
      const textParts: string[] = []
      let resultText = ''

      try {
        for await (const token of claudeStream(prompt, DETAIL_SYSTEM)) {
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
        const result = agent.normalizeDetail(JSON.parse(raw))
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
