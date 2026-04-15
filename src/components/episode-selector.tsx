'use client'

import { useState, useEffect, useRef } from 'react'

interface EpisodeCandidate {
  id: string | number
  title: string
  origin: string
  culture: string
  twist: string
  mood: string
  hook: string
}

interface EpisodeDetail {
  opening: string
  original: string
  error: string
  inspirationMoment: string
  possibleEndings: string[]
}

type ViewPhase =
  | 'loading'        // 초기 로딩 (timeline 체크)
  | 'idle'
  | 'has-timeline'   // timeline 존재 → 바로 집필 가능
  | 'streaming'
  | 'selecting'
  | 'detail-streaming'
  | 'detailing'
  | 'executing'
  | 'chapter-done'

// --- Terminal Log Component ---
interface LogLine {
  type: 'thinking' | 'text' | 'system' | 'agent'
  content: string
}

function TerminalLog({ logs, elapsed, currentAgent }: {
  logs: LogLine[]
  elapsed: number
  currentAgent?: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-gray-500 font-mono">
            chronicler{currentAgent ? ` — ${currentAgent}` : ' — claude'}
          </span>
          <span className="ml-auto text-xs text-gray-600 font-mono">{timeStr}</span>
        </div>
        <div className="p-4 h-96 overflow-y-auto font-mono text-sm leading-relaxed">
          {logs.map((line, i) => (
            <div key={i} className={
              line.type === 'thinking' ? 'text-gray-500 italic' :
              line.type === 'system' ? 'text-indigo-400 font-semibold' :
              line.type === 'agent' ? 'text-amber-400' :
              'text-green-400/90'
            }>
              <span className="text-gray-700 select-none">
                {line.type === 'thinking' ? '💭 ' :
                 line.type === 'system' ? '⚙ ' :
                 line.type === 'agent' ? '▸ ' :
                 '> '}
              </span>
              {line.content}
            </div>
          ))}
          <div className="text-green-400/90 animate-pulse">
            <span className="text-gray-700 select-none">{'> '}</span>
            <span className="inline-block w-2 h-4 bg-green-400/70" />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

// --- Chapter View Component ---
function ChapterView({ chapter, chapterPath, onReset }: {
  chapter: string
  chapterPath?: string
  onReset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-center">챕터 완성</h2>
      {chapterPath && (
        <p className="text-center text-gray-500 text-sm mb-6">
          저장됨: <span className="font-mono text-gray-400">{chapterPath}</span>
        </p>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
          {chapter}
        </div>
      </div>
      <p className="text-center text-gray-600 text-xs mt-4">
        Phase 결과: <span className="font-mono">phases/state/</span>
      </p>
      <div className="text-center mt-6">
        <button
          onClick={onReset}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          새 에피소드 생성
        </button>
      </div>
    </div>
  )
}

// --- Pipeline SSE Stream ---
async function streamPipeline(
  onSystem: (msg: string) => void,
  onAgent: (msg: string) => void,
  onThinking: (text: string) => void,
  onText: (text: string) => void,
  onChapter: (chapter: string, chapterPath?: string) => void,
  onError: (error: string) => void,
  onCurrentAgent: (agent: string) => void,
) {
  const res = await fetch('/api/episodes/execute', { method: 'POST' })
  const reader = res.body?.getReader()
  if (!reader) { onError('No stream'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))

        switch (event.type) {
          case 'pipeline_start':
            onSystem(`전체 ${event.totalPhases}개 Phase 실행을 시작합니다`)
            break
          case 'phase_start':
            onSystem(`━━━ Phase: ${event.name} ━━━`)
            break
          case 'agent_start':
            onCurrentAgent(event.agent)
            onAgent(`${event.agent} 에이전트 시작`)
            break
          case 'thinking':
            onThinking(event.content)
            break
          case 'token':
            onText(event.content)
            break
          case 'agent_complete':
            onAgent(`${event.agent} 완료 ✓`)
            break
          case 'phase_complete':
            onSystem(`Phase "${event.name || event.phase}" 완료`)
            break
          case 'pipeline_complete':
            onChapter(event.chapter, event.chapterPath)
            break
          case 'error':
            onError(event.error)
            break
        }
      } catch {
        // incomplete JSON
      }
    }
  }
}

// --- Episode SSE Stream Helper ---
async function streamSSE(
  url: string,
  options: RequestInit,
  onThinking: (text: string) => void,
  onText: (text: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDone: (result: any) => void,
  onError: (error: string) => void,
) {
  const res = await fetch(url, options)
  const reader = res.body?.getReader()
  if (!reader) { onError('No stream'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))
        if (event.type === 'thinking') onThinking(event.content)
        else if (event.type === 'text') onText(event.content)
        else if (event.type === 'done') onDone(event.result)
        else if (event.type === 'error') onError(event.error)
      } catch {
        // incomplete JSON
      }
    }
  }
}

// --- Main Component ---
export function EpisodeSelector() {
  const [phase, setPhase] = useState<ViewPhase>('loading')
  const [episodes, setEpisodes] = useState<EpisodeCandidate[]>([])
  const [selected, setSelected] = useState<EpisodeCandidate | null>(null)
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)
  const [chapter, setChapter] = useState('')
  const [chapterPath, setChapterPath] = useState<string>()
  const [timelineContent, setTimelineContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [currentAgent, setCurrentAgent] = useState<string>()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 마운트 시 timeline 존재 여부 확인
  useEffect(() => {
    fetch('/api/bible')
      .then(res => res.json())
      .then(bible => {
        if (bible.timeline) {
          setTimelineContent(bible.timeline)
          setPhase('has-timeline')
        } else {
          setPhase('idle')
        }
      })
      .catch(() => setPhase('idle'))
  }, [])

  const startTimer = () => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const addSystem = (msg: string) => {
    setLogs(prev => [...prev, { type: 'system', content: msg }])
  }

  const addAgent = (msg: string) => {
    setLogs(prev => [...prev, { type: 'agent', content: msg }])
  }

  const thinkBufRef = useRef('')
  const textBufRef = useRef('')

  const addThinking = (token: string) => {
    thinkBufRef.current += token
    const lines = thinkBufRef.current.split('\n')
    if (lines.length > 1) {
      const completed = lines.slice(0, -1)
      setLogs(prev => [...prev, ...completed.filter(l => l.trim()).map(l => ({ type: 'thinking' as const, content: l }))])
      thinkBufRef.current = lines[lines.length - 1]
    }
  }

  const addText = (token: string) => {
    textBufRef.current += token
    const lines = textBufRef.current.split('\n')
    if (lines.length > 1) {
      const completed = lines.slice(0, -1)
      setLogs(prev => [...prev, ...completed.filter(l => l.trim()).map(l => ({ type: 'text' as const, content: l }))])
      textBufRef.current = lines[lines.length - 1]
    }
  }

  const flushBufs = () => {
    if (thinkBufRef.current.trim()) {
      setLogs(prev => [...prev, { type: 'thinking', content: thinkBufRef.current.trim() }])
    }
    if (textBufRef.current.trim()) {
      setLogs(prev => [...prev, { type: 'text', content: textBufRef.current.trim() }])
    }
    thinkBufRef.current = ''
    textBufRef.current = ''
  }

  const handleGenerate = async () => {
    setPhase('streaming')
    setError(null)
    setLogs([{ type: 'system', content: '에피소드 후보를 생성합니다...' }])
    thinkBufRef.current = ''
    textBufRef.current = ''
    startTimer()

    await streamSSE(
      '/api/episodes/suggest',
      { method: 'POST' },
      addThinking,
      addText,
      (result) => {
        flushBufs()
        stopTimer()
        setEpisodes(result.episodes)
        setPhase('selecting')
      },
      (err) => {
        flushBufs()
        stopTimer()
        setError(err)
        setPhase('idle')
      },
    )
  }

  const handleSelect = async (ep: EpisodeCandidate) => {
    setSelected(ep)
    setPhase('detail-streaming')
    setLogs([{ type: 'system', content: `"${ep.title}" 상세 설계를 생성합니다...` }])
    thinkBufRef.current = ''
    textBufRef.current = ''
    startTimer()

    await streamSSE(
      '/api/episodes/detail',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: ep.id, episode_summary: ep.twist }),
      },
      addThinking,
      addText,
      (result) => {
        flushBufs()
        stopTimer()
        setDetail(result)
        setPhase('detailing')
      },
      (err) => {
        flushBufs()
        stopTimer()
        setError(err)
        setPhase('selecting')
      },
    )
  }

  const handleConfirm = async () => {
    if (!detail || !selected) return

    // 1. timeline에 저장
    try {
      await fetch('/api/episodes/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: selected.id,
          title: selected.title,
          origin: selected.origin,
          culture: selected.culture,
          opening: detail.opening,
          original: detail.original,
          error: detail.error,
          inspiration_moment: detail.inspirationMoment,
          possible_endings: detail.possibleEndings,
        }),
      })
    } catch {
      setError('확정에 실패했습니다.')
      return
    }

    // 2. 바로 Phase 실행 시작
    setPhase('executing')
    setLogs([
      { type: 'system', content: `에피소드 "${selected.title}" 확정 완료` },
      { type: 'system', content: '집필 파이프라인을 시작합니다...' },
    ])
    thinkBufRef.current = ''
    textBufRef.current = ''
    startTimer()

    await streamPipeline(
      addSystem,
      addAgent,
      addThinking,
      addText,
      (chapterText, savedPath) => {
        flushBufs()
        stopTimer()
        setChapter(chapterText)
        setChapterPath(savedPath)
        setPhase('chapter-done')
      },
      (err) => {
        flushBufs()
        stopTimer()
        setError(err)
      },
      setCurrentAgent,
    )
  }

  const handleStartWriting = async () => {
    setPhase('executing')
    setLogs([
      { type: 'system', content: 'timeline.md 감지 — 에피소드 선택 생략' },
      { type: 'system', content: '집필 파이프라인을 시작합니다...' },
    ])
    thinkBufRef.current = ''
    textBufRef.current = ''
    startTimer()

    await streamPipeline(
      addSystem,
      addAgent,
      addThinking,
      addText,
      (chapterText, savedPath) => {
        flushBufs()
        stopTimer()
        setChapter(chapterText)
        setChapterPath(savedPath)
        setPhase('chapter-done')
      },
      (err) => {
        flushBufs()
        stopTimer()
        setError(err)
      },
      setCurrentAgent,
    )
  }

  const handleRegenerate = () => {
    setSelected(null)
    setDetail(null)
    handleGenerate()
  }

  const handleReset = () => {
    setPhase('idle')
    setEpisodes([])
    setSelected(null)
    setDetail(null)
    setChapter('')
    setError(null)
    setLogs([])
    setCurrentAgent(undefined)
    stopTimer()
  }

  return (
    <div>
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {phase === 'loading' && (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      )}

      {phase === 'idle' && (
        <div className="text-center">
          <button
            onClick={handleGenerate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
          >
            새 에피소드 생성
          </button>
        </div>
      )}

      {phase === 'has-timeline' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-indigo-400">확정된 에피소드</h2>
            <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {timelineContent}
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStartWriting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              이 에피소드로 집필 시작
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-6 py-4 rounded-xl font-semibold transition-colors"
            >
              새 에피소드 생성
            </button>
          </div>
        </div>
      )}

      {(phase === 'streaming' || phase === 'detail-streaming' || phase === 'executing') && (
        <TerminalLog logs={logs} elapsed={elapsed} currentAgent={currentAgent} />
      )}

      {phase === 'selecting' && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">에피소드 후보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => handleSelect(ep)}
                className="bg-gray-900 border border-gray-800 hover:border-indigo-500 rounded-xl p-6 text-left transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">
                    {ep.culture}
                  </span>
                  {ep.mood && <span className="text-xs text-gray-500">| {ep.mood}</span>}
                </div>
                <h3 className="text-lg font-semibold mb-1">{ep.title}</h3>
                <p className="text-gray-500 text-xs mb-2">{ep.origin}</p>
                <p className="text-gray-400 text-sm mb-3">{ep.twist}</p>
                <p className="text-indigo-300 text-sm italic">&ldquo;{ep.hook}&rdquo;</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={handleRegenerate}
              className="text-gray-400 hover:text-gray-200 underline text-sm"
            >
              다시 생성
            </button>
          </div>
        </div>
      )}

      {phase === 'detailing' && detail && selected && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-1">{selected.title}</h2>
          <p className="text-indigo-400 text-sm mb-1">{selected.culture} | {selected.origin}</p>
          <p className="text-gray-500 text-sm mb-6">{selected.twist}</p>

          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">결 진입</h3>
              <p className="text-gray-200">{detail.opening}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">원래 이야기</h3>
              <p className="text-gray-200">{detail.original}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">어긋난 설정</h3>
              <p className="text-gray-200">{detail.error}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">영감의 순간</h3>
              <p className="text-gray-200">{detail.inspirationMoment}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">가능한 결말</h3>
              <ul className="list-disc list-inside text-gray-200 space-y-1">
                {(detail.possibleEndings || []).map((ending, i) => (
                  <li key={i}>{ending}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex gap-4 mt-8 justify-center">
            <button
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              확정 & 집필 시작
            </button>
            <button
              onClick={handleRegenerate}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              다시 생성
            </button>
            <button
              onClick={() => setPhase('selecting')}
              className="text-gray-400 hover:text-gray-200 px-6 py-3 rounded-lg transition-colors"
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {phase === 'chapter-done' && (
        <ChapterView chapter={chapter} chapterPath={chapterPath} onReset={handleReset} />
      )}
    </div>
  )
}
