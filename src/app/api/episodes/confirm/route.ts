import { NextRequest, NextResponse } from 'next/server'
import { getBible } from '@/lib/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const bible = getBible()
  const entry = [
    `## ${body.title}`,
    '',
    `- **ID**: ${body.episode_id}`,
    `- **진입 순간**: ${body.entry_point}`,
    `- **원래 이야기**: ${body.original_story}`,
    `- **어긋난 설정**: ${body.divergence}`,
    `- **영감의 순간**: ${body.inspiration}`,
    `- **가능한 결말**: ${body.possible_endings.join(', ')}`,
  ].join('\n')
  bible.appendTimeline(entry)
  return NextResponse.json({ status: 'confirmed', episodeId: body.episode_id })
}
