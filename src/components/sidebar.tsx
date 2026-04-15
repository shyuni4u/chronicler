'use client'

import type { ViewPhase, EpisodeCandidate } from './types'

interface SidebarProps {
  phase: ViewPhase
  timelineContent: string
  selected: EpisodeCandidate | null
  onNewEpisode: () => void
  onResumeWriting: () => void
  onTimelineChange: () => void
}

function parseTimelineEpisodes(content: string): { title: string; lines: string[] }[] {
  if (!content.trim()) return []
  const sections = content.split(/^## /m).filter(Boolean)
  return sections.map(section => {
    const lines = section.split('\n')
    const title = lines[0]?.trim() || '제목 없음'
    const body = lines.slice(1).filter(l => l.trim())
    return { title, lines: body }
  })
}

export function Sidebar({ phase, timelineContent, selected, onNewEpisode, onResumeWriting, onTimelineChange }: SidebarProps) {
  const episodes = parseTimelineEpisodes(timelineContent)
  const isWorking = phase === 'streaming' || phase === 'detail-streaming' || phase === 'executing'

  const handleDelete = async (title: string) => {
    if (!confirm(`"${title}" 에피소드를 삭제할까요?`)) return
    await fetch('/api/episodes/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    onTimelineChange()
  }

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-gray-800/50 bg-gray-950 shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-gray-800/50">
        <h1 className="text-lg font-bold tracking-tight">Chronicler</h1>
        <p className="text-[11px] text-gray-600 mt-0.5">이야기 속으로, 한 챕터씩</p>
      </div>

      {/* New Button */}
      <div className="px-4 py-3">
        <button
          onClick={onNewEpisode}
          disabled={isWorking}
          className="w-full bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.06] text-gray-300 text-sm py-2.5 rounded-xl transition-all"
        >
          + 새 에피소드
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-3 px-1">Timeline</p>

        {episodes.length === 0 && (
          <p className="text-gray-700 text-xs px-1">아직 에피소드가 없습니다</p>
        )}

        {episodes.map((ep, i) => (
          <div
            key={i}
            className="flex items-start gap-1 px-1 mb-0.5 group/item"
          >
            <button
              onClick={onResumeWriting}
              className="flex-1 text-left px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors min-w-0"
            >
              <p className="text-sm text-gray-400 group-hover/item:text-gray-200 transition-colors truncate">
                {ep.title}
              </p>
              {ep.lines[0] && (
                <p className="text-[11px] text-gray-700 truncate mt-0.5">
                  {ep.lines[0].replace(/^-\s*\*\*.*?\*\*:\s*/, '')}
                </p>
              )}
            </button>
            <button
              onClick={() => handleDelete(ep.title)}
              className="opacity-0 group-hover/item:opacity-100 text-gray-700 hover:text-red-400 px-1.5 py-2.5 text-xs transition-all shrink-0"
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Current Status */}
      {selected && (
        <div className="px-4 py-3 border-t border-gray-800/50">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-1">현재</p>
          <p className="text-xs text-gray-400 truncate">{selected.title}</p>
        </div>
      )}

      {/* Status Indicator */}
      {isWorking && (
        <div className="px-5 py-3 border-t border-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] text-gray-600">작업 중</span>
          </div>
        </div>
      )}
    </aside>
  )
}
