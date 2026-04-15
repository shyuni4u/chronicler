'use client'

import { useEffect, useRef } from 'react'
import type { LogLine } from './types'

interface LogPanelProps {
  logs: LogLine[]
  elapsed: number
  currentAgent?: string
  show: boolean
  onToggle: () => void
  isStreaming: boolean
}

export function LogPanel({ logs, elapsed, currentAgent, show, onToggle, isStreaming }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (show) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length, show])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="border-t border-gray-800/50">
      {/* Toggle Bar */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[11px] text-gray-600 font-mono">
          {show ? '▼' : '▲'} LOG
        </span>
        {isStreaming && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-gray-600 font-mono">
              {currentAgent || 'claude'}
            </span>
          </span>
        )}
        {isStreaming && (
          <span className="ml-auto text-[11px] text-gray-700 font-mono tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        )}
        {!isStreaming && logs.length > 0 && (
          <span className="text-[11px] text-gray-700">{logs.length} lines</span>
        )}
      </button>

      {/* Log Content */}
      {show && (
        <div className="h-52 overflow-y-auto bg-black/40 px-5 py-3 font-mono text-[12px] leading-5">
          {logs.length === 0 && (
            <p className="text-gray-800">대기 중</p>
          )}
          {logs.map((line, i) => (
            <div key={i} className={
              line.type === 'thinking' ? 'text-gray-700' :
              line.type === 'system' ? 'text-blue-500/60' :
              line.type === 'agent' ? 'text-amber-600/60' :
              'text-gray-500'
            }>
              <span className="text-gray-800 select-none mr-1.5 inline-block w-3 text-right">
                {line.type === 'thinking' ? '~' :
                 line.type === 'system' ? '*' :
                 line.type === 'agent' ? '>' :
                 ' '}
              </span>
              {line.type === 'thinking' ? <span className="italic">{line.content}</span> : line.content}
            </div>
          ))}
          {isStreaming && (
            <div className="text-gray-700">
              <span className="text-gray-800 select-none mr-1.5 inline-block w-3 text-right">{' '}</span>
              <span className="inline-block w-1.5 h-3.5 bg-gray-700 rounded-sm animate-pulse" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
