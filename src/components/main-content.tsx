'use client'

import { useRef, type Dispatch, type SetStateAction } from 'react'
import type { EpisodeCandidate, EpisodeDetail, LogLine, ViewPhase } from './types'

interface Props {
  phase: ViewPhase
  setPhase: Dispatch<SetStateAction<ViewPhase>>
  episodes: EpisodeCandidate[]
  setEpisodes: Dispatch<SetStateAction<EpisodeCandidate[]>>
  selected: EpisodeCandidate | null
  setSelected: Dispatch<SetStateAction<EpisodeCandidate | null>>
  detail: EpisodeDetail | null
  setDetail: Dispatch<SetStateAction<EpisodeDetail | null>>
  chapter: string
  setChapter: Dispatch<SetStateAction<string>>
  chapterPath: string | undefined
  setChapterPath: Dispatch<SetStateAction<string | undefined>>
  timelineContent: string
  setError: Dispatch<SetStateAction<string | null>>
  logs: LogLine[]
  setLogs: Dispatch<SetStateAction<LogLine[]>>
  elapsed: number
  currentAgent: string | undefined
  setCurrentAgent: Dispatch<SetStateAction<string | undefined>>
  startTimer: () => void
  stopTimer: () => void
}

// ─── SSE Helpers ────────────────────────────────────────────

async function streamSSE(
  url: string, options: RequestInit,
  onThinking: (t: string) => void, onText: (t: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDone: (r: any) => void, onError: (e: string) => void,
) {
  const res = await fetch(url, options)
  const reader = res.body?.getReader()
  if (!reader) { onError('No stream'); return }
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const l of lines) {
      if (!l.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(l.slice(6))
        if (ev.type === 'thinking') onThinking(ev.content)
        else if (ev.type === 'text') onText(ev.content)
        else if (ev.type === 'done') onDone(ev.result)
        else if (ev.type === 'error') onError(ev.error)
      } catch { /* skip */ }
    }
  }
}

async function streamPipeline(
  onSys: (m: string) => void, onAgent: (m: string) => void,
  onThink: (t: string) => void, onText: (t: string) => void,
  onChapter: (c: string, p?: string) => void, onErr: (e: string) => void,
  onCurAgent: (a: string) => void,
) {
  const res = await fetch('/api/episodes/execute', { method: 'POST' })
  const reader = res.body?.getReader()
  if (!reader) { onErr('No stream'); return }
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const l of lines) {
      if (!l.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(l.slice(6))
        switch (ev.type) {
          case 'pipeline_start': onSys(`${ev.totalPhases}개 Phase 시작`); break
          case 'phase_start': onSys(`── ${ev.name} ──`); break
          case 'agent_start': onCurAgent(ev.agent); onAgent(ev.agent); break
          case 'thinking': onThink(ev.content); break
          case 'token': onText(ev.content); break
          case 'agent_complete': onAgent(`${ev.agent} done`); break
          case 'phase_complete': onSys(`${ev.name || ev.phase} 완료`); break
          case 'pipeline_complete': onChapter(ev.chapter, ev.chapterPath); break
          case 'error': onErr(ev.error); break
        }
      } catch { /* skip */ }
    }
  }
}

// ─── Component ──────────────────────────────────────────────

export function MainContent(props: Props) {
  const {
    phase, setPhase, episodes, setEpisodes,
    selected, setSelected, detail, setDetail,
    chapter, setChapter, chapterPath, setChapterPath,
    timelineContent, setError,
    setLogs, setCurrentAgent,
    startTimer, stopTimer,
  } = props

  const thinkBuf = useRef('')
  const textBuf = useRef('')

  const addSys = (m: string) => setLogs(p => [...p, { type: 'system', content: m }])
  const addAgent = (m: string) => setLogs(p => [...p, { type: 'agent', content: m }])

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
      (r) => { flush(); stopTimer(); setEpisodes(r.episodes); setPhase('selecting') },
      (e) => { flush(); stopTimer(); setError(e); setPhase('idle') },
    )
  }

  const handleSelect = async (ep: EpisodeCandidate) => {
    setSelected(ep); setPhase('detail-streaming'); resetBufs(); startTimer()
    setLogs([{ type: 'system', content: `${ep.title} 상세 설계 중` }])
    await streamSSE('/api/episodes/detail', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_id: ep.id, episode_summary: ep.twist }),
    }, addThinking, addText,
      (r) => { flush(); stopTimer(); setDetail(r); setPhase('detailing') },
      (e) => { flush(); stopTimer(); setError(e); setPhase('selecting') },
    )
  }

  const runPipeline = async (initLogs: LogLine[]) => {
    setPhase('executing'); resetBufs(); startTimer(); setLogs(initLogs)
    await streamPipeline(addSys, addAgent, addThinking, addText,
      (t, p) => { flush(); stopTimer(); setChapter(t); setChapterPath(p); setPhase('chapter-done') },
      (e) => { flush(); stopTimer(); setError(e) },
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
    runPipeline([{ type: 'system', content: `"${selected.title}" 확정 — 집필 시작` }])
  }

  const handleStartWriting = () => runPipeline([
    { type: 'system', content: '기존 에피소드로 집필 시작' },
  ])

  const handleReset = () => {
    setPhase('idle'); setEpisodes([]); setSelected(null); setDetail(null)
    setChapter(''); setChapterPath(undefined); setError(null); setLogs([])
    setCurrentAgent(undefined); stopTimer()
  }

  // ─── Views ────────────────────────────────────────────────

  if (phase === 'loading') {
    return <div className="text-center py-20 text-gray-800 animate-pulse">...</div>
  }

  if (phase === 'idle') {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-gray-600 mb-8">새로운 이야기를 시작하세요</p>
        <button
          onClick={handleGenerate}
          className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-10 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-[1.02]"
        >
          에피소드 생성
        </button>
      </div>
    )
  }

  if (phase === 'has-timeline') {
    return (
      <div className="max-w-xl mx-auto py-16 animate-fade-in">
        <div className="bg-gray-900/30 border border-gray-800/30 rounded-2xl p-8 mb-8">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-4">마지막 에피소드</p>
          <div className="text-gray-500 text-sm whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {timelineContent}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleStartWriting}
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-8 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
          >
            이어서 집필
          </button>
          <button
            onClick={() => setPhase('idle')}
            className="text-gray-600 hover:text-gray-400 px-4 py-3 text-sm transition-colors"
          >
            새 에피소드
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'streaming' || phase === 'detail-streaming' || phase === 'executing') {
    return (
      <div className="py-16 animate-fade-in">
        <p className="text-center text-gray-600 text-sm mb-2">
          {phase === 'streaming' ? '에피소드 후보 생성 중' :
           phase === 'detail-streaming' ? '상세 설계 생성 중' : '집필 중'}
        </p>
        <p className="text-center text-gray-800 text-xs">하단 로그 패널에서 진행 상황을 확인하세요</p>
      </div>
    )
  }

  if (phase === 'selecting') {
    return (
      <div className="animate-fade-in">
        <p className="text-gray-600 text-sm mb-6">에피소드를 선택하세요</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {episodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => handleSelect(ep)}
              className="group bg-gray-900/30 border border-gray-800/30 hover:border-gray-700/50 rounded-2xl p-5 text-left transition-all hover:bg-gray-900/50"
            >
              <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">{ep.culture}</p>
              <h3 className="text-base font-semibold mb-1 group-hover:text-white transition-colors">{ep.title}</h3>
              <p className="text-gray-600 text-xs mb-2">{ep.origin}</p>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{ep.twist}</p>
              <p className="text-gray-600 text-xs italic">{ep.hook}</p>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={() => { setSelected(null); setDetail(null); handleGenerate() }}
            className="text-gray-700 hover:text-gray-500 text-xs transition-colors">
            다시 생성
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'detailing' && detail && selected) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">{selected.culture} &middot; {selected.origin}</p>
        <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
        <p className="text-gray-500 text-sm mb-10">{selected.twist}</p>

        <div className="space-y-8">
          {[
            { label: '결 진입', value: detail.opening },
            { label: '원래 이야기', value: detail.original },
            { label: '어긋난 설정', value: detail.error },
            { label: '영감의 순간', value: detail.inspirationMoment },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">{item.label}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{item.value}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-2">가능한 결말</p>
            <div className="space-y-2">
              {(detail.possibleEndings || []).map((ending, i) => (
                <p key={i} className="text-gray-300 text-sm leading-relaxed pl-4 border-l-2 border-gray-800/50">
                  {ending}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-12">
          <button onClick={handleConfirm}
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 px-8 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]">
            확정 & 집필
          </button>
          <button onClick={() => { setSelected(null); setDetail(null); handleGenerate() }}
            className="text-gray-600 hover:text-gray-400 px-4 py-3 text-sm transition-colors">
            다시 생성
          </button>
          <button onClick={() => setPhase('selecting')}
            className="text-gray-600 hover:text-gray-400 px-4 py-3 text-sm transition-colors">
            뒤로
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'chapter-done') {
    const handleExport = () => {
      const blob = new Blob([chapter], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = chapterPath?.split('/').pop() || 'chapter.md'
      a.click()
      URL.revokeObjectURL(url)
    }

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full">완성</span>
          {chapterPath && <span className="text-gray-700 text-xs font-mono">{chapterPath}</span>}
        </div>
        <div className="bg-gray-900/30 border border-gray-800/30 rounded-2xl p-10">
          <div className="text-gray-200 text-[15px] whitespace-pre-wrap leading-8">
            {chapter}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-8">
          <button onClick={handleExport}
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            .md 다운로드
          </button>
          <button onClick={handleReset}
            className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            새 에피소드 시작
          </button>
        </div>
      </div>
    )
  }

  return null
}
