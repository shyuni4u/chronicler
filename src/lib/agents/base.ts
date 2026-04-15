import { claudeStream, type StreamToken } from '@/lib/claude-cli'
import type { AgentContext } from '@/lib/types'

export abstract class BaseAgent {
  abstract readonly agentId: string
  abstract readonly systemPrompt: string
  abstract buildMessages(context: AgentContext): Array<{ role: string; content: string }>

  async *run(context: AgentContext): AsyncGenerator<StreamToken> {
    const messages = this.buildMessages(context)
    const userMessage = messages.map(m => m.content).join('\n\n')
    yield* claudeStream(userMessage, this.systemPrompt)
  }
}
