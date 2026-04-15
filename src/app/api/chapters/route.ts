import { NextResponse } from 'next/server'
import { getDB } from '@/lib/server'

export async function GET() {
  return NextResponse.json(getDB().listChapters())
}
