'use client'

import { useState } from 'react'

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

type Phase = 'idle' | 'loading' | 'selecting' | 'detailing' | 'detail-loading' | 'confirmed'

export function EpisodeSelector() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [episodes, setEpisodes] = useState<EpisodeCandidate[]>([])
  const [selected, setSelected] = useState<EpisodeCandidate | null>(null)
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/episodes/suggest', { method: 'POST' })
      const data = await res.json()
      setEpisodes(data.episodes)
      setPhase('selecting')
    } catch (e) {
      setError('에피소드 생성에 실패했습니다. 다시 시도해주세요.')
      setPhase('idle')
    }
  }

  const handleSelect = async (ep: EpisodeCandidate) => {
    setSelected(ep)
    setPhase('detail-loading')
    try {
      const res = await fetch('/api/episodes/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: ep.id, episode_summary: ep.summary }),
      })
      const data = await res.json()
      setDetail(data)
      setPhase('detailing')
    } catch (e) {
      setError('상세 설계 생성에 실패했습니다.')
      setPhase('selecting')
    }
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
    } catch (e) {
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

      {(phase === 'loading' || phase === 'detail-loading') && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">
            {phase === 'loading' ? 'AI가 에피소드 후보를 생성하고 있습니다...' : '상세 설계를 생성하고 있습니다...'}
          </p>
        </div>
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
                {detail.possibleEndings.map((ending, i) => (
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
