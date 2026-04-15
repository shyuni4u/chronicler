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
  | 'loading'
  | 'idle'
  | 'has-timeline'
  | 'streaming'
  | 'selecting'
  | 'detail-streaming'
  | 'detailing'
  | 'executing'
  | 'chapter-done'

// ─── Terminal ───────────────────────────────────────────────
interface LogLine {
  type: 'thinking' | 'text' | 'system' | 'agent'
  content: string
}

function TerminalLog({ logs, elapsed, currentAgent, label }: {
  logs: LogLine[]
  elapsed: number
  currentAgent?: string
  label?: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {label && (
        <p className="text-center text-gray-500 text-sm mb-4">{label}</p>
      )}
      <div className="bg-black/60 border border-gray-800/60 rounded-2xl overflow-hidden backdrop-blur-sm">
        {/* title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          </div>
          <span className="ml-3 text-[11px] text-gray-600 font-mono">
            {currentAgent || 'chronicler'}
          </span>
          <span className="ml-auto text-[11px] text-gray-700 font-mono tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        {/* body */}
        <div className="p-5 h-[420px] overflow-y-auto font-mono text-[13px] leading-6">
          {logs.map((line, i) => (
            <div key={i} className={
              line.type === 'thinking' ? 'text-gray-600' :
              line.type === 'system' ? 'text-blue-400/80' :
              line.type === 'agent' ? 'text-amber-500/80' :
              'text-gray-300'
            }>
              <span className="text-gray-800 select-none mr-2">
                {line.type === 'thinking' ? '~' :
                 line.type === 'system' ? '*' :
                 line.type === 'agent' ? '>' :
                 ' '}
              </span>
              {line.type === 'thinking' ? <span className="italic">{line.content}</span> : line.content}
            </div>
          ))}
          <div className="text-gray-600 animate-pulse">
            <span className="text-gray-800 select-none mr-2">{' '}</span>
            <span className="inline-block w-1.5 h-4 bg-gray-600 rounded-sm" />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

// ─── Chapter View ───────────────────────────────────────────
function ChapterView({ chapter, chapterPath, onReset }: {
  chapter: string
  chapterPath?: string
  onReset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-sm px-4 py-1.5 rounded-full mb-4">
          <span>&#10003;</span> 챕터 완성
        </div>
        {chapterPath && (
          <p className="text-gray-600 text-xs font-mono">{chapterPath}</p>
        )}
      </div>
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-10">
        <div className="text-gray-200 text-[15px] whitespace-pre-wrap leading-8 font-[serif]">
          {chapter}
        </div>
      </div>
      <div className="text-center mt-10">
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          새 에피소드 시작
        </button>
      </div>
    </div>
  )
}

// ─── SSE Helpers ────────────────────────────────────────────
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
        const ev = JSON.parse(line.slice(6))
        switch (ev.type) {
          case 'pipeline_start': onSystem(`${ev.totalPhases}개 Phase 시작`); break
          case 'phase_start': onSystem(`── ${ev.name} ──`); break
          case 'agent_start': onCurrentAgent(ev.agent); onAgent(`${ev.agent}`); break
          case 'thinking': onThinking(ev.content); break
          case 'token': onText(ev.content); break
          case 'agent_complete': onAgent(`${ev.agent} done`); break
          case 'phase_complete': onSystem(`${ev.name || ev.phase} 완료`); break
          case 'pipeline_complete': onChapter(ev.chapter, ev.chapterPath); break
          case 'error': onError(ev.error); break
        }
      } catch { /* incomplete */ }
    }
  }
}

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
        const ev = JSON.parse(line.slice(6))
        if (ev.type === 'thinking') onThinking(ev.content)
        else if (ev.type === 'text') onText(ev.content)
        else if (ev.type === 'done') onDone(ev.result)
        else if (ev.type === 'error') onError(ev.error)
      } catch { /* incomplete */ }
    }
  }
}

// ─── Main ───────────────────────────────────────────────────
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

  useEffect(() => {
    fetch('/api/bible')
      .then(r => r.json())
      .then(bible => {
        if (bible.timeline) { setTimelineContent(bible.timeline); setPhase('has-timeline') }
        else setPhase('idle')
      })
      .catch(() => setPhase('idle'))
  }, [])

  const startTimer = () => { setElapsed(0); timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000) }
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  const addSystem = (msg: string) => setLogs(p => [...p, { type: 'system', content: msg }])
  const addAgent = (msg: string) => setLogs(p => [...p, { type: 'agent', content: msg }])

  const thinkBuf = useRef('')
  const textBuf = useRef('')

  const addThinking = (token: string) => {
    thinkBuf.current += token
    const lines = thinkBuf.current.split('\n')
    if (lines.length > 1) {
      setLogs(p => [...p, ...lines.slice(0, -1).filter(l => l.trim()).map(l => ({ type: 'thinking' as const, content: l }))])
      thinkBuf.current = lines[lines.length - 1]
    }
  }

  const addText = (token: string) => {
    textBuf.current += token
    const lines = textBuf.current.split('\n')
    if (lines.length > 1) {
      setLogs(p => [...p, ...lines.slice(0, -1).filter(l => l.trim()).map(l => ({ type: 'text' as const, content: l }))])
      textBuf.current = lines[lines.length - 1]
    }
  }

  const flush = () => {
    if (thinkBuf.current.trim()) setLogs(p => [...p, { type: 'thinking', content: thinkBuf.current.trim() }])
    if (textBuf.current.trim()) setLogs(p => [...p, { type: 'text', content: textBuf.current.trim() }])
    thinkBuf.current = ''; textBuf.current = ''
  }

  const resetBufs = () => { thinkBuf.current = ''; textBuf.current = '' }

  // ─── Handlers ─────────────────────────────────────────────

  const handleGenerate = async () => {
    setPhase('streaming'); setError(null); resetBufs(); startTimer()
    setLogs([{ type: 'system', content: '에피소드 후보 생성 중' }])
    await streamSSE('/api/episodes/suggest', { method: 'POST' }, addThinking, addText,
      (result) => { flush(); stopTimer(); setEpisodes(result.episodes); setPhase('selecting') },
      (err) => { flush(); stopTimer(); setError(err); setPhase('idle') },
    )
  }

  const handleSelect = async (ep: EpisodeCandidate) => {
    setSelected(ep); setPhase('detail-streaming'); resetBufs(); startTimer()
    setLogs([{ type: 'system', content: `${ep.title} 상세 설계 중` }])
    await streamSSE('/api/episodes/detail', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_id: ep.id, episode_summary: ep.twist }),
    }, addThinking, addText,
      (result) => { flush(); stopTimer(); setDetail(result); setPhase('detailing') },
      (err) => { flush(); stopTimer(); setError(err); setPhase('selecting') },
    )
  }

  const runPipeline = async (initLogs: LogLine[]) => {
    setPhase('executing'); resetBufs(); startTimer(); setLogs(initLogs)
    await streamPipeline(addSystem, addAgent, addThinking, addText,
      (text, path) => { flush(); stopTimer(); setChapter(text); setChapterPath(path); setPhase('chapter-done') },
      (err) => { flush(); stopTimer(); setError(err) },
      setCurrentAgent,
    )
  }

  const handleConfirm = async () => {
    if (!detail || !selected) return
    try {
      await fetch('/api/episodes/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: selected.id, title: selected.title,
          origin: selected.origin, culture: selected.culture,
          opening: detail.opening, original: detail.original,
          error: detail.error, inspiration_moment: detail.inspirationMoment,
          possible_endings: detail.possibleEndings,
        }),
      })
    } catch { setError('확정 실패'); return }
    runPipeline([
      { type: 'system', content: `"${selected.title}" 확정` },
      { type: 'system', content: '집필 시작' },
    ])
  }

  const handleStartWriting = () => runPipeline([
    { type: 'system', content: '기존 에피소드로 집필 시작' },
  ])

  const handleReset = () => {
    setPhase('idle'); setEpisodes([]); setSelected(null); setDetail(null)
    setChapter(''); setChapterPath(undefined); setError(null); setLogs([])
    setCurrentAgent(undefined); stopTimer()
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div>
      {error && (
        <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
          <div className="bg-red-950/40 border border-red-900/40 text-red-300 text-sm px-5 py-3 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="text-center py-20 text-gray-700 animate-pulse">...</div>
      )}

      {/* Idle */}
      {phase === 'idle' && (
        <div className="text-center animate-fade-in">
          <p className="text-gray-600 text-sm mb-8">새로운 이야기를 시작하세요</p>
          <button
            onClick={handleGenerate}
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-10 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-[1.02]"
          >
            에피소드 생성
          </button>
        </div>
      )}

      {/* Has Timeline */}
      {phase === 'has-timeline' && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl p-8 mb-8">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">이전 에피소드</p>
            <div className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {timelineContent}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStartWriting}
              className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-8 py-3.5 rounded-xl font-medium transition-all hover:scale-[1.02]"
            >
              이어서 집필
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="text-gray-600 hover:text-gray-400 px-6 py-3.5 text-sm transition-colors"
            >
              새 에피소드
            </button>
          </div>
        </div>
      )}

      {/* Streaming (Terminal) */}
      {(phase === 'streaming' || phase === 'detail-streaming' || phase === 'executing') && (
        <TerminalLog
          logs={logs}
          elapsed={elapsed}
          currentAgent={currentAgent}
          label={
            phase === 'streaming' ? '에피소드 후보 생성 중' :
            phase === 'detail-streaming' ? '상세 설계 생성 중' :
            '집필 중'
          }
        />
      )}

      {/* Episode Cards */}
      {phase === 'selecting' && (
        <div className="animate-fade-in">
          <p className="text-center text-gray-500 text-sm mb-8">에피소드를 선택하세요</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => handleSelect(ep)}
                className="group bg-gray-900/40 border border-gray-800/40 hover:border-gray-700/60 rounded-2xl p-5 text-left transition-all hover:bg-gray-900/60"
              >
                <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">{ep.culture}</p>
                <h3 className="text-base font-semibold mb-1.5 group-hover:text-white transition-colors">{ep.title}</h3>
                <p className="text-gray-500 text-xs mb-3">{ep.origin}</p>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{ep.twist}</p>
                <p className="text-gray-500 text-xs italic leading-relaxed">{ep.hook}</p>
              </button>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => { setSelected(null); setDetail(null); handleGenerate() }}
              className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              다시 생성
            </button>
          </div>
        </div>
      )}

      {/* Episode Detail */}
      {phase === 'detailing' && detail && selected && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          <div className="mb-10">
            <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-2">{selected.culture} &middot; {selected.origin}</p>
            <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
            <p className="text-gray-500 text-sm">{selected.twist}</p>
          </div>

          <div className="space-y-8">
            {[
              { label: '결 진입', value: detail.opening },
              { label: '원래 이야기', value: detail.original },
              { label: '어긋난 설정', value: detail.error },
              { label: '영감의 순간', value: detail.inspirationMoment },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-2">{item.label}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{item.value}</p>
              </div>
            ))}

            <div>
              <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-2">가능한 결말</p>
              <div className="space-y-2">
                {(detail.possibleEndings || []).map((ending, i) => (
                  <p key={i} className="text-gray-300 text-sm leading-relaxed pl-4 border-l-2 border-gray-800">
                    {ending}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-12">
            <button
              onClick={handleConfirm}
              className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-8 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
            >
              확정 & 집필 시작
            </button>
            <button
              onClick={() => { setSelected(null); setDetail(null); handleGenerate() }}
              className="text-gray-600 hover:text-gray-400 px-4 py-3 text-sm transition-colors"
            >
              다시 생성
            </button>
            <button
              onClick={() => setPhase('selecting')}
              className="text-gray-600 hover:text-gray-400 px-4 py-3 text-sm transition-colors"
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {/* Chapter Done */}
      {phase === 'chapter-done' && (
        <ChapterView chapter={chapter} chapterPath={chapterPath} onReset={handleReset} />
      )}
    </div>
  )
}
