'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MainContent } from './main-content'
import { LogPanel } from './log-panel'
import type { LogLine, EpisodeCandidate, EpisodeDetail, ViewPhase } from './types'

export function AppShell() {
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
  const [showLog, setShowLog] = useState(false)
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  // 초기 로드
  useEffect(() => {
    fetch('/api/bible')
      .then(r => r.json())
      .then(bible => {
        if (bible.timeline) { setTimelineContent(bible.timeline); setPhase('has-timeline') }
        else setPhase('idle')
      })
      .catch(() => setPhase('idle'))
  }, [])

  const startTimer = () => {
    setElapsed(0)
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    setTimerRef(id)
  }
  const stopTimer = () => {
    if (timerRef) { clearInterval(timerRef); setTimerRef(null) }
  }

  const refreshTimeline = () => {
    fetch('/api/bible')
      .then(r => r.json())
      .then(bible => {
        if (bible.timeline) { setTimelineContent(bible.timeline); setPhase('has-timeline') }
        else { setTimelineContent(''); setPhase('idle') }
      })
      .catch(() => {})
  }

  // 스트리밍 시작 시 로그 자동 열기
  const isStreaming = phase === 'streaming' || phase === 'detail-streaming' || phase === 'executing'
  useEffect(() => {
    if (isStreaming) setShowLog(true)
  }, [isStreaming])

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        phase={phase}
        timelineContent={timelineContent}
        selected={selected}
        onNewEpisode={() => setPhase('idle')}
        onResumeWriting={() => setPhase('has-timeline')}
        onTimelineChange={refreshTimeline}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-10">
            {error && (
              <div className="mb-6 bg-red-950/40 border border-red-900/40 text-red-300 text-sm px-5 py-3 rounded-xl animate-fade-in">
                {error}
                <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-400">×</button>
              </div>
            )}
            <MainContent
              phase={phase}
              setPhase={setPhase}
              episodes={episodes}
              setEpisodes={setEpisodes}
              selected={selected}
              setSelected={setSelected}
              detail={detail}
              setDetail={setDetail}
              chapter={chapter}
              setChapter={setChapter}
              chapterPath={chapterPath}
              setChapterPath={setChapterPath}
              timelineContent={timelineContent}
              setError={setError}
              logs={logs}
              setLogs={setLogs}
              elapsed={elapsed}
              currentAgent={currentAgent}
              setCurrentAgent={setCurrentAgent}
              startTimer={startTimer}
              stopTimer={stopTimer}
            />
          </div>
        </main>

        {/* Log Panel (bottom, toggleable) */}
        <LogPanel
          logs={logs}
          elapsed={elapsed}
          currentAgent={currentAgent}
          show={showLog}
          onToggle={() => setShowLog(v => !v)}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
