import { NextRequest, NextResponse } from 'next/server'
import { getBible } from '@/lib/server'

export async function POST(request: NextRequest) {
  const { title } = await request.json()
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }
  const bible = getBible()
  const deleted = bible.deleteTimelineEpisode(title)
  return NextResponse.json({ deleted })
}
