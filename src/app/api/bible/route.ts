import { NextResponse } from 'next/server'
import { getBible } from '@/lib/server'

export async function GET() {
  return NextResponse.json(getBible().readAll())
}
