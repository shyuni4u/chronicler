import fs from 'fs'
import path from 'path'
import { getPhaseRunner } from '@/lib/server'

function getNextChapterNum(chaptersDir: string): number {
  if (!fs.existsSync(chaptersDir)) return 1
  const files = fs.readdirSync(chaptersDir).filter(f => /^\d+\.md$/.test(f))
  if (files.length === 0) return 1
  const nums = files.map(f => parseInt(f.replace('.md', ''), 10))
  return Math.max(...nums) + 1
}

export async function POST() {
  const runner = getPhaseRunner()
  const encoder = new TextEncoder()
  const chaptersDir = process.env.CHAPTERS_DIR || 'chapters'
  const stateDir = path.join('phases', 'state')

  const stream = new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pipelineResult: any = null

      try {
        for await (const event of runner.runAllPhases()) {
          const parsed = JSON.parse(event.data)
          const payload = { type: event.event, ...parsed }

          // pipeline_complete 시 파일 저장
          if (event.event === 'pipeline_complete') {
            pipelineResult = parsed

            // chapters/ 디렉토리 생성
            fs.mkdirSync(chaptersDir, { recursive: true })
            const chapterNum = getNextChapterNum(chaptersDir)
            const chapterPath = path.join(chaptersDir, `${String(chapterNum).padStart(2, '0')}.md`)

            // 챕터 저장
            fs.writeFileSync(chapterPath, parsed.chapter, 'utf-8')
            console.log(`[execute] chapter saved: ${chapterPath}`)

            // 각 Phase 결과를 phases/state/에 저장
            fs.mkdirSync(stateDir, { recursive: true })
            if (parsed.phaseOutputs) {
              for (const [key, output] of Object.entries(parsed.phaseOutputs)) {
                const safeName = key.replace(/\//g, '_')
                const outputPath = path.join(stateDir, `${safeName}.md`)
                fs.writeFileSync(outputPath, output as string, 'utf-8')
              }
              console.log(`[execute] phase outputs saved to ${stateDir}/`)
            }

            // 파일 경로 정보를 클라이언트에 전달
            payload.chapterPath = chapterPath
            payload.chapterNum = chapterNum
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
