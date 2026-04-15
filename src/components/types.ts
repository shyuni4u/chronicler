export interface EpisodeCandidate {
  id: string | number
  title: string
  origin: string
  culture: string
  twist: string
  mood: string
  hook: string
}

export interface EpisodeDetail {
  opening: string
  original: string
  error: string
  inspirationMoment: string
  possibleEndings: string[]
}

export interface LogLine {
  type: 'thinking' | 'text' | 'system' | 'agent'
  content: string
}

export type ViewPhase =
  | 'loading'
  | 'idle'
  | 'has-timeline'
  | 'streaming'
  | 'selecting'
  | 'detail-streaming'
  | 'detailing'
  | 'executing'
  | 'chapter-done'
