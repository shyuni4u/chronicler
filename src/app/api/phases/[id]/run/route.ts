import { NextRequest } from 'next/server'
import { getEngine, getPhaseRunner } from '@/lib/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const engine = getEngine()
  try {
    engine.getPhase(id)
  } catch {
    return new Response(JSON.stringify({ error: `Phase not found: ${id}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const runner = getPhaseRunner()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runner.runPhase(id)) {
          controller.enqueue(encoder.encode(`event: ${event.event}\ndata: ${event.data}\n\n`))
        }
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
