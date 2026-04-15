import { NextRequest, NextResponse } from 'next/server'
import { getEngine, getDB } from '@/lib/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const engine = getEngine()
  try {
    const phase = engine.getPhase(id)
    const state = getDB().getPhase(id)
    return NextResponse.json({
      id: phase.id,
      name: phase.name,
      dependsOnPhase: phase.dependsOnPhase,
      agents: phase.agents.map(a => ({ id: a.id, dependsOn: a.dependsOn })),
      status: (state?.status as string) ?? 'pending',
    })
  } catch {
    return NextResponse.json({ error: `Phase not found: ${id}` }, { status: 404 })
  }
}
