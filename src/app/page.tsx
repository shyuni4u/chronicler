import { EpisodeSelector } from '@/components/episode-selector'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Chronicler</h1>
          <p className="text-gray-400">Multi-agent novel writing system. One chapter at a time.</p>
        </header>
        <EpisodeSelector />
      </div>
    </main>
  )
}
