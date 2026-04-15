import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ num: string }> }
) {
  const { num } = await params
  const chapter = getDB().getChapter(parseInt(num, 10))
  if (!chapter) {
    return NextResponse.json({ error: `Chapter ${num} not found` }, { status: 404 })
  }
  return NextResponse.json(chapter)
}
