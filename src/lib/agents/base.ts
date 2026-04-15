import Anthropic from '@anthropic-ai/sdk'
import type { AgentContext } from '@/lib/types'

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export abstract class BaseAgent {
  abstract readonly agentId: string
  abstract readonly systemPrompt: string
  abstract buildMessages(context: AgentContext): Array<{ role: string; content: string }>

  async *run(context: AgentContext, client?: Anthropic): AsyncGenerator<string> {
    if (!client) client = new Anthropic()
    const messages = this.buildMessages(context)
    const stream = client.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}
