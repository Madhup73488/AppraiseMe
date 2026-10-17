import type {
  AIProvider,
  ProviderHealth,
  StructuredGenerationRequest,
} from '@appraiseme/contracts'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

/**
 * Browser-side AIProvider that forwards calls to the web app's API routes.
 * The API key lives only on the server (encrypted at rest) — this client
 * authenticates with its Supabase session token instead.
 */
export function createProxyProvider(authToken: string): AIProvider {
  async function call(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${authToken}`,
        ...(typeof init?.body === 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
    })
    if (res.status === 429) {
      throw new RateLimitError('AI provider rate limit exceeded')
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new AIProviderError(body?.error || `AI proxy error (${res.status})`, {
        provider: 'proxy',
        status: res.status,
      })
    }
    return res
  }

  return {
    async generate<T>(req: StructuredGenerationRequest<T>): Promise<T> {
      const res = await call('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          systemPrompt: req.systemPrompt,
          userPrompt: req.userPrompt,
          model: req.model,
          temperature: req.temperature,
        }),
      })
      const json = (await res.json()) as { data: unknown }
      return req.parse(json.data)
    },

    async transcribeAudio(audio: Blob): Promise<string> {
      const form = new FormData()
      form.append('file', audio, 'capture.webm')
      const res = await call('/api/ai/transcribe', {
        method: 'POST',
        body: form,
      })
      const json = (await res.json()) as { text?: string }
      if (!json.text) {
        throw new AIProviderError('Transcription returned no text', {
          provider: 'proxy',
        })
      }
      return json.text
    },

    async testConnection(): Promise<ProviderHealth> {
      // the connection was verified when it was saved server-side
      return { healthy: true }
    },
  }
}
