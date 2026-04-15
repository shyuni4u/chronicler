import { NextResponse } from 'next/server'
import { EpisodeAgent } from '@/lib/agents/episode-agent'
import { getBible } from '@/lib/server'

export async function POST() {
  const bible = getBible()
  const agent = new EpisodeAgent()
  const result = await agent.suggest(bible.readAll())
  return NextResponse.json(result)
}
