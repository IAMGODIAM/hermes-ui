// Hermes API Client
// Connects to the Hermes gateway API server (OpenAI-compatible SSE)
// Default: http://localhost:8642/v1

import { store } from './state'

// ─── Configuration ──────────────────────────────────────────────

interface HermesConfig {
  baseUrl: string
  apiKey?: string
  sessionId?: string
}

const DEFAULT_CONFIG: HermesConfig = {
  baseUrl: 'http://localhost:8642',
}

let config: HermesConfig = { ...DEFAULT_CONFIG }
let abortController: AbortController | null = null

export function configure(opts: Partial<HermesConfig>): void {
  config = { ...config, ...opts }
}

export function getConfig(): HermesConfig {
  return { ...config }
}

// ─── Health Check ───────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${config.baseUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      store.update({ isConnected: true, agentModel: data.platform || 'hermes-agent' })
      return true
    }
  } catch {
    // Connection failed
  }
  store.update({ isConnected: false })
  return false
}

// ─── Streaming Chat ─────────────────────────────────────────────

interface ChatOptions {
  onToken?: (token: string) => void
  onToolProgress?: (name: string, emoji: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: string) => void
}

export async function sendMessage(userText: string, opts: ChatOptions = {}): Promise<void> {
  // Build conversation history from store
  const state = store.getState()
  const messages: Array<{ role: string; content: string }> = []

  for (const msg of state.messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      if (msg.content && msg.status === 'complete') {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
  }

  // Add the new user message
  messages.push({ role: 'user', content: userText })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  if (config.sessionId) {
    headers['X-Hermes-Session-Id'] = config.sessionId
  }

  abortController = new AbortController()

  try {
    const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'hermes-agent',
        messages,
        stream: true,
      }),
      signal: abortController.signal,
    })

    if (!res.ok) {
      const errBody = await res.text()
      let errMsg = `HTTP ${res.status}`
      try {
        const parsed = JSON.parse(errBody)
        errMsg = parsed.error?.message || errMsg
      } catch { /* use status code */ }
      opts.onError?.(errMsg)
      return
    }

    // Capture session ID from response
    const sessionId = res.headers.get('X-Hermes-Session-Id')
    if (sessionId) {
      config.sessionId = sessionId
    }

    // Parse SSE stream
    const reader = res.body?.getReader()
    if (!reader) {
      opts.onError?.('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()

        if (data === '[DONE]') {
          opts.onComplete?.(fullText)
          return
        }

        try {
          const chunk = JSON.parse(data)
          const delta = chunk.choices?.[0]?.delta

          if (delta?.content) {
            const content = delta.content

            // Check if this is a tool progress marker
            // Format: \n`emoji tool_name`\n
            const toolMatch = content.match(/\n?`([^\s]+)\s+([^`]+)`\n?/)
            if (toolMatch) {
              opts.onToolProgress?.(toolMatch[2], toolMatch[1])
            } else {
              fullText += content
              opts.onToken?.(content)
            }
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // If we get here without [DONE], stream ended naturally
    if (fullText) {
      opts.onComplete?.(fullText)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled
      opts.onComplete?.(store.getState().messages.find(m => m.status === 'streaming')?.content || '')
    } else {
      opts.onError?.(err.message || 'Connection failed')
    }
  } finally {
    abortController = null
  }
}

// ─── Stop Generation ────────────────────────────────────────────

export function stopGeneration(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

// ─── Connection Monitor ─────────────────────────────────────────

let healthInterval: ReturnType<typeof setInterval> | null = null

export function startHealthMonitor(intervalMs: number = 10000): void {
  stopHealthMonitor()
  checkHealth() // Immediate check
  healthInterval = setInterval(checkHealth, intervalMs)
}

export function stopHealthMonitor(): void {
  if (healthInterval) {
    clearInterval(healthInterval)
    healthInterval = null
  }
}
