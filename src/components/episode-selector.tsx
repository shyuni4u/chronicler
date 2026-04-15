'use client'

import { useState, useEffect, useRef } from 'react'

interface EpisodeCandidate {
  id: string
  category: string
  title: string
  summary: string
  hook: string
}

interface EpisodeDetail {
  episodeId: string
  entryPoint: string
  originalStory: string
  divergence: string
  inspiration: string
  possibleEndings: string[]
}

type Phase = 'idle' | 'streaming' | 'selecting' | 'detail-streaming' | 'detailing' | 'confirmed'

// --- Terminal Log Component ---
interface LogLine {
  type: 'thinking' | 'text' | 'system'
  content: string
}

function TerminalLog({ logs, elapsed }: { logs: LogLine[]; elapsed: number }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `0:${secs.toString().padStart(2, '0')}`

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-gray-500 font-mono">chronicler — claude</span>
          <span className="ml-auto text-xs text-gray-600 font-mono">{timeStr}</span>
        </div>
        <div className="p-4 h-80 overflow-y-auto font-mono text-sm leading-relaxed">
          {logs.map((line, i) => (
            <div key={i} className={
              line.type === 'thinking' ? 'text-gray-500 italic' :
              line.type === 'system' ? 'text-indigo-400' :
              'text-green-400/90'
            }>
              <span className="text-gray-700 select-none">
                {line.type === 'thinking' ? '💭 ' : line.type === 'system' ? '⚙ ' : '> '}
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

// --- SSE Stream Helper ---
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
  const [phase, setPhase] = useState<Phase>('idle')
  const [episodes, setEpisodes] = useState<EpisodeCandidate[]>([])
  const [selected, setSelected] = useState<EpisodeCandidate | null>(null)
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // 토큰을 받아서 줄 단위로 로그에 추가
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
        body: JSON.stringify({ episode_id: ep.id, episode_summary: ep.summary }),
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
    try {
      await fetch('/api/episodes/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: detail.episodeId,
          title: selected.title,
          entry_point: detail.entryPoint,
          original_story: detail.originalStory,
          divergence: detail.divergence,
          inspiration: detail.inspiration,
          possible_endings: detail.possibleEndings,
        }),
      })
      setPhase('confirmed')
    } catch {
      setError('확정에 실패했습니다.')
    }
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
    setError(null)
    setLogs([])
    stopTimer()
  }

  return (
    <div>
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
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

      {(phase === 'streaming' || phase === 'detail-streaming') && (
        <TerminalLog logs={logs} elapsed={elapsed} />
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
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">
                  {ep.category}
                </span>
                <h3 className="text-lg font-semibold mt-2 mb-2">{ep.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{ep.summary}</p>
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
          <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
          <p className="text-indigo-400 text-sm mb-6">{selected.category}</p>

          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">진입 순간</h3>
              <p className="text-gray-200">{detail.entryPoint}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">원래 이야기</h3>
              <p className="text-gray-200">{detail.originalStory}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">어긋난 설정</h3>
              <p className="text-gray-200">{detail.divergence}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">영감의 순간</h3>
              <p className="text-gray-200">{detail.inspiration}</p>
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
              확정
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

      {phase === 'confirmed' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">에피소드가 확정되었습니다</h2>
          <p className="text-gray-400 mb-6">bible/timeline.md에 추가되었습니다.</p>
          <button
            onClick={handleReset}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            새 에피소드 생성
          </button>
        </div>
      )}
    </div>
  )
}
