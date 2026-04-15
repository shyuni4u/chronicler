import { NextRequest, NextResponse } from 'next/server'
import { getBible } from '@/lib/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const bible = getBible()
  const entry = [
    `## ${body.title}`,
    '',
    `- **문화권**: ${body.culture}`,
    `- **원전**: ${body.origin}`,
    `- **결 진입**: ${body.opening}`,
    `- **원래 이야기**: ${body.original}`,
    `- **어긋난 설정**: ${body.error}`,
    `- **영감의 순간**: ${body.inspiration_moment}`,
    `- **가능한 결말**: ${(body.possible_endings || []).join(' / ')}`,
  ].join('\n')
  bible.appendTimeline(entry)
  return NextResponse.json({ status: 'confirmed', episodeId: body.episode_id })
}
