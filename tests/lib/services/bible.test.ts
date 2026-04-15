import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { BibleService } from '@/lib/services/bible'

let bibleDir: string
let service: BibleService

beforeEach(() => {
  bibleDir = path.join(os.tmpdir(), `bible-${Date.now()}`)
  fs.mkdirSync(bibleDir, { recursive: true })
  service = new BibleService(bibleDir)
})

describe('BibleService', () => {
  it('lists files', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '# World', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'characters.md'), '# Chars', 'utf-8')
    expect(service.listFiles().sort()).toEqual(['characters.md', 'world.md'])
  })

  it('reads file', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '중세 판타지', 'utf-8')
    expect(service.readFile('world.md')).toContain('중세 판타지')
  })

  it('reads all', () => {
    fs.writeFileSync(path.join(bibleDir, 'world.md'), '판타지', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'characters.md'), '아린', 'utf-8')
    const all = service.readAll()
    expect(all.world).toContain('판타지')
    expect(all.characters).toContain('아린')
  })

  it('throws on missing file', () => {
    expect(() => service.readFile('nope.md')).toThrow()
  })

  it('returns empty for empty dir', () => {
    expect(service.listFiles()).toEqual([])
    expect(service.readAll()).toEqual({})
  })

  it('ignores example dir', () => {
    const exDir = path.join(bibleDir, 'example')
    fs.mkdirSync(exDir)
    fs.writeFileSync(path.join(exDir, 'world.example.md'), 'template', 'utf-8')
    fs.writeFileSync(path.join(bibleDir, 'world.md'), 'real', 'utf-8')
    const files = service.listFiles()
    expect(files).toContain('world.md')
    expect(files).not.toContain('example/world.example.md')
  })

  it('appends timeline to new file', () => {
    service.appendTimeline('## Ep1\n콩쥐팥쥐')
    const content = fs.readFileSync(path.join(bibleDir, 'timeline.md'), 'utf-8')
    expect(content).toContain('콩쥐팥쥐')
  })

  it('appends timeline to existing file', () => {
    fs.writeFileSync(path.join(bibleDir, 'timeline.md'), '# Timeline\n\n## Ep0\n기존', 'utf-8')
    service.appendTimeline('## Ep1\n새 에피소드')
    const content = fs.readFileSync(path.join(bibleDir, 'timeline.md'), 'utf-8')
    expect(content).toContain('기존')
    expect(content).toContain('새 에피소드')
  })
})
