import spawn from 'cross-spawn'
import path from 'path'
import os from 'os'
import fs from 'fs'

function loadOAuthToken(): string | null {
  try {
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json')
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'))
    return creds.claudeAiOauth?.accessToken || null
  } catch {
    return null
  }
}

function getSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  if (!env.ANTHROPIC_API_KEY) {
    const token = loadOAuthToken()
    if (token) env.ANTHROPIC_API_KEY = token
  }
  return env
}

/**
 * Claude CLI를 호출하고 전체 응답 텍스트를 반환한다.
 */
export async function claudePrompt(prompt: string, systemPrompt?: string): Promise<string> {
  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--bare']
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: getSpawnEnv(),
    })

    let stdoutBuf = ''
    let stderrBuf = ''
    let resultText = ''

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString()
      const lines = stdoutBuf.split('\n')
      stdoutBuf = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text') resultText += block.text
            }
          }
          if (event.type === 'result' && event.result) {
            resultText = event.result
          }
        } catch {
          // incomplete JSON chunk, skip
        }
      }
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) resolve(resultText)
      else reject(new Error(stderrBuf || `claude exited with code ${code}`))
    })

    proc.on('error', (err: Error) => {
      reject(err)
    })
  })
}

/**
 * Claude CLI를 호출하고 토큰을 스트리밍으로 yield한다.
 */
export async function* claudeStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--bare']
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }

  const proc = spawn('claude', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: getSpawnEnv(),
  })

  let stdoutBuf = ''
  let stderrBuf = ''

  const chunks: string[] = []
  let done = false
  let error: Error | null = null

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const lines = stdoutBuf.split('\n')
    stdoutBuf = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          chunks.push(event.delta.text)
        }
      } catch {
        // incomplete JSON chunk
      }
    }
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString()
  })

  proc.on('close', (code: number | null) => {
    done = true
    if (code !== 0) error = new Error(stderrBuf || `claude exited with code ${code}`)
  })

  proc.on('error', (err: Error) => {
    done = true
    error = err
  })

  // Poll for chunks
  while (!done || chunks.length > 0) {
    if (chunks.length > 0) {
      yield chunks.shift()!
    } else if (!done) {
      await new Promise(r => setTimeout(r, 10))
    }
  }

  if (error) throw error
}
