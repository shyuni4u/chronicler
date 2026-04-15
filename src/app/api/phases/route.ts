import { NextResponse } from 'next/server'
import { getEngine, getDB } from '@/lib/server'

export async function GET() {
  const engine = getEngine()
  const db = getDB()
  const result = engine.phases.map(p => {
    const state = db.getPhase(p.id)
    return {
      id: p.id,
      name: p.name,
      dependsOnPhase: p.dependsOnPhase,
      agents: p.agents.map(a => ({ id: a.id, dependsOn: a.dependsOn })),
      status: (state?.status as string) ?? 'pending',
    }
  })
  return NextResponse.json(result)
}
