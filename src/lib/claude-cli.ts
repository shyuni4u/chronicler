import spawn from 'cross-spawn'
import path from 'path'
import os from 'os'
import fs from 'fs'

export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  return match ? match[1].trim() : trimmed
}

function getSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  if (!env.ANTHROPIC_API_KEY) {
    try {
      const credPath = path.join(os.homedir(), '.claude', '.credentials.json')
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'))
      const token = creds.claudeAiOauth?.accessToken
      if (token) env.ANTHROPIC_API_KEY = token
    } catch {
      // credentials not found
    }
  }
  return env
}

function baseArgs(prompt: string, systemPrompt?: string): string[] {
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--model', 'sonnet',
    '--verbose',
    '--bare',
    '--no-session-persistence',
    '--tools', '',
    '--permission-mode', 'bypassPermissions',
    '--include-partial-messages',
  ]
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }
  return args
}

export interface StreamToken {
  type: 'thinking' | 'text' | 'result'
  content: string
}

/**
 * Claude CLI 스트리밍 — thinking과 text를 구분하여 yield.
 */
export async function* claudeStream(prompt: string, systemPrompt?: string): AsyncGenerator<StreamToken> {
  const args = baseArgs(prompt, systemPrompt)
  const start = Date.now()

  console.log(`[claude-cli] spawn at ${new Date().toISOString()}`)

  const proc = spawn('claude', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: getSpawnEnv(),
  })

  let stdoutBuf = ''
  let stderrBuf = ''
  const tokens: StreamToken[] = []
  let done = false
  let error: Error | null = null
  let firstToken = false

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const lines = stdoutBuf.split('\n')
    stdoutBuf = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)

        if (event.type === 'stream_event') {
          const inner = event.event || event
          if (inner?.type === 'content_block_delta') {
            if (inner.delta?.type === 'thinking_delta' && inner.delta?.thinking) {
              tokens.push({ type: 'thinking', content: inner.delta.thinking })
              if (!firstToken) { firstToken = true; console.log(`[claude-cli] first token at ${((Date.now() - start) / 1000).toFixed(1)}s (thinking)`) }
            } else if (inner.delta?.type === 'text_delta' && inner.delta?.text) {
              tokens.push({ type: 'text', content: inner.delta.text })
              if (!firstToken) { firstToken = true; console.log(`[claude-cli] first token at ${((Date.now() - start) / 1000).toFixed(1)}s (text)`) }
            }
          }
        }
        else if (event.type === 'result' && event.result) {
          tokens.push({ type: 'result', content: event.result })
          console.log(`[claude-cli] result at ${((Date.now() - start) / 1000).toFixed(1)}s (${event.result.length} chars)`)
        }
      } catch {
        // incomplete JSON
      }
    }
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString().trim()
  })

  proc.on('close', (code: number | null) => {
    done = true
    console.log(`[claude-cli] done code=${code} elapsed=${((Date.now() - start) / 1000).toFixed(1)}s`)
    if (code !== 0) error = new Error(stderrBuf || `claude exited with code ${code}`)
  })

  proc.on('error', (err: Error) => {
    done = true
    error = err
  })

  while (!done || tokens.length > 0) {
    if (tokens.length > 0) {
      yield tokens.shift()!
    } else if (!done) {
      await new Promise(r => setTimeout(r, 10))
    }
  }

  if (error) throw error
}

/**
 * Claude CLI 단발 호출 — 전체 텍스트 반환.
 */
export async function claudePrompt(prompt: string, systemPrompt?: string): Promise<string> {
  const textParts: string[] = []
  let resultText = ''

  for await (const token of claudeStream(prompt, systemPrompt)) {
    if (token.type === 'text') textParts.push(token.content)
    if (token.type === 'result') resultText = token.content
  }

  const output = resultText || textParts.join('')
  return stripCodeFence(output)
}
