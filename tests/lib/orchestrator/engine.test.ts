import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { DAGEngine } from '@/lib/orchestrator/engine'
import type { PhasesConfig } from '@/lib/types'

const config: PhasesConfig = {
  phases: [
    { id: '01_world_building', name: 'World Building', agents: [{ id: 'world_builder', dependsOn: [] }] },
    { id: '02_characters', name: 'Characters', dependsOnPhase: '01_world_building', agents: [{ id: 'character_designer', dependsOn: [] }] },
    { id: '03_plot', name: 'Plot', dependsOnPhase: '02_characters', agents: [{ id: 'plot_architect', dependsOn: [] }] },
    { id: '04_chapter_N', name: 'Chapter', dependsOnPhase: '03_plot', agents: [{ id: 'writer', dependsOn: [] }, { id: 'editor', dependsOn: ['writer'] }] },
  ],
}

describe('DAGEngine', () => {
  it('loads from file', () => {
    const p = path.join(os.tmpdir(), `phases-${Date.now()}.json`)
    fs.writeFileSync(p, JSON.stringify({ phases: [{ id: '01', name: 'T', agents: [{ id: 'a', depends_on: [] }] }] }))
    const engine = DAGEngine.fromFile(p)
    expect(engine.phases).toHaveLength(1)
    fs.unlinkSync(p)
  })

  it('gets phase', () => {
    const engine = new DAGEngine(config)
    expect(engine.getPhase('01_world_building').name).toBe('World Building')
  })

  it('throws on unknown phase', () => {
    const engine = new DAGEngine(config)
    expect(() => engine.getPhase('nope')).toThrow()
  })

  it('returns phase order', () => {
    const engine = new DAGEngine(config)
    const ids = engine.phaseOrder().map(p => p.id)
    expect(ids).toEqual(['01_world_building', '02_characters', '03_plot', '04_chapter_N'])
  })

  it('can run first phase', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('01_world_building', new Set())).toBe(true)
  })

  it('can run phase with dependency met', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('02_characters', new Set(['01_world_building']))).toBe(true)
  })

  it('cannot run phase with unmet dependency', () => {
    const engine = new DAGEngine(config)
    expect(engine.canRunPhase('02_characters', new Set())).toBe(false)
  })

  it('simple agent order', () => {
    const engine = new DAGEngine(config)
    expect(engine.agentExecutionOrder('01_world_building')).toEqual([['world_builder']])
  })

  it('sequential agent order', () => {
    const engine = new DAGEngine(config)
    expect(engine.agentExecutionOrder('04_chapter_N')).toEqual([['writer'], ['editor']])
  })

  it('parallel agent order', () => {
    const c: PhasesConfig = { phases: [
      { id: 'test', name: 'T', agents: [
        { id: 'a', dependsOn: [] }, { id: 'b', dependsOn: [] }, { id: 'c', dependsOn: ['a', 'b'] },
      ]},
    ]}
    const order = new DAGEngine(c).agentExecutionOrder('test')
    expect(order).toHaveLength(2)
    expect(new Set(order[0])).toEqual(new Set(['a', 'b']))
    expect(order[1]).toEqual(['c'])
  })
})
