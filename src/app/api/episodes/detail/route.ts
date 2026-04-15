import { NextRequest, NextResponse } from 'next/server'
import { EpisodeAgent } from '@/lib/agents/episode-agent'
import { getBible } from '@/lib/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const bible = getBible()
  const agent = new EpisodeAgent()
  const result = await agent.detail(
    body.episode_id,
    bible.readAll(),
    body.episode_summary ?? '',
  )
  return NextResponse.json(result)
}
