import fs from 'fs'
import path from 'path'

export class BibleService {
  private dir: string

  constructor(bibleDir: string) {
    this.dir = bibleDir
  }

  listFiles(): string[] {
    if (!fs.existsSync(this.dir)) return []
    return fs.readdirSync(this.dir)
      .filter(f => {
        const full = path.join(this.dir, f)
        return fs.statSync(full).isFile() && f.endsWith('.md')
      })
      .sort()
  }

  readFile(filename: string): string {
    const filePath = path.join(this.dir, filename)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bible file not found: ${filename}`)
    }
    return fs.readFileSync(filePath, 'utf-8')
  }

  readAll(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const filename of this.listFiles()) {
      const key = filename.replace(/\.md$/, '')
      result[key] = this.readFile(filename)
    }
    return result
  }

  appendTimeline(content: string): void {
    const timelinePath = path.join(this.dir, 'timeline.md')
    if (fs.existsSync(timelinePath)) {
      const existing = fs.readFileSync(timelinePath, 'utf-8')
      fs.writeFileSync(timelinePath, existing.trimEnd() + '\n\n' + content + '\n', 'utf-8')
    } else {
      fs.writeFileSync(timelinePath, content + '\n', 'utf-8')
    }
  }
}
