import type {
  AIProvider,
  StructuredGenerationRequest,
  TextGenerationRequest,
  ProviderHealth,
} from '@appraiseme/contracts'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

export interface CreateCompatibleProviderOptions {
  apiKey: string
  baseUrl: string
  defaultModel?: string
  embeddingModel?: string
}

export function createCompatibleProvider(
  opts: CreateCompatibleProviderOptions,
): AIProvider {
  const baseUrl = opts.baseUrl.replace(/\/$/, '')
  const defaultModel = opts.defaultModel || 'gpt-4o'
  const embeddingModel = opts.embeddingModel || 'text-embedding-3-small'

  if (!opts.baseUrl) {
    throw new AIProviderError('baseUrl is required for compatible provider', {
      provider: 'compatible',
    })
  }

  // Some OpenAI-compatible gateways only serve routes under /v1 (e.g.
  // https://host/v1/chat/completions). Detect once and remember.
  let useV1Prefix = false

  async function fetchApi(path: string, init: RequestInit): Promise<Response> {
    const primary = useV1Prefix ? `/v1${path}` : path
    const res = await fetch(`${baseUrl}${primary}`, init)
    if (res.status === 404 && !useV1Prefix) {
      const alt = await fetch(`${baseUrl}/v1${path}`, init)
      if (alt.ok) {
        useV1Prefix = true
        return alt
      }
    }
    return res
  }

  async function request<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetchApi(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      throw new RateLimitError('Compatible provider rate limit exceeded')
    }

    if (!res.ok) {
      const text = await res.text()
      throw new AIProviderError(
        `Compatible provider error (${res.status}): ${redactError(text)}`,
        { status: res.status, provider: 'compatible' },
      )
    }

    return res.json() as Promise<T>
  }

  return {
    async generate<T>(req: StructuredGenerationRequest<T>): Promise<T> {
      const body: Record<string, unknown> = {
        model: req.model || defaultModel,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        temperature: req.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }

      let data: { choices: Array<{ message: { content: string } }> }
      try {
        data = await request('/chat/completions', body)
      } catch (e) {
        // Some OpenAI-compatible backends (Ollama, older vLLM, certain
        // LiteLLM routes) reject response_format — retry without it.
        if (e instanceof AIProviderError && isRetryableFormatError(e)) {
          const fallback = { ...body }
          delete fallback.response_format
          data = await request('/chat/completions', fallback)
        } else {
          throw e
        }
      }

      const content = data.choices[0]?.message?.content
      if (!content)
        throw new AIProviderError(
          'Compatible provider returned empty response',
          { provider: 'compatible' },
        )

      try {
        const parsed = extractJson(content)
        return req.parse(parsed)
      } catch (e) {
        throw new AIProviderError(
          `Compatible provider response parse failed: ${e instanceof Error ? e.message : 'unknown'}`,
          { provider: 'compatible' },
        )
      }
    },

    async *stream(req: TextGenerationRequest): AsyncIterable<string> {
      const res = await fetchApi('/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model: req.model || defaultModel,
          messages: [
            { role: 'system', content: req.systemPrompt },
            { role: 'user', content: req.userPrompt },
          ],
          temperature: req.temperature ?? 0.3,
          max_tokens: req.maxTokens,
          stream: true,
        }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new AIProviderError(
          `Compatible provider stream error (${res.status}): ${redactError(text)}`,
          { status: res.status, provider: 'compatible' },
        )
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6).trim()
            if (json === '') continue
            try {
              const chunk = JSON.parse(json)
              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) yield delta
            } catch {
              // skip
            }
          }
        }
      }
    },

    async embed(texts: string[]): Promise<number[][]> {
      const data = await request<{
        data: Array<{ embedding: number[] }>
      }>('/embeddings', {
        model: embeddingModel,
        input: texts,
      })
      return data.data.map((d) => d.embedding)
    },

    async transcribeAudio(audio: Blob, model?: string): Promise<string> {
      const form = new FormData()
      form.append('file', audio, 'capture.webm')
      form.append('model', model || 'whisper-1')
      const res = await fetchApi('/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        body: form,
      })
      if (res.status === 429) {
        throw new RateLimitError('Compatible provider rate limit exceeded')
      }
      if (!res.ok) {
        const text = await res.text()
        throw new AIProviderError(
          `Transcription failed (${res.status}): ${redactError(text)}`,
          { status: res.status, provider: 'compatible' },
        )
      }
      const data = (await res.json()) as { text?: string }
      if (!data.text) {
        throw new AIProviderError('Transcription returned no text', {
          provider: 'compatible',
        })
      }
      return data.text
    },

    async testConnection(): Promise<ProviderHealth> {
      const start = Date.now()
      try {
        const res = await fetchApi('/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${opts.apiKey}` },
        })
        if (!res.ok) {
          const text = await res.text()
          return {
            healthy: false,
            latencyMs: Date.now() - start,
            error: `HTTP ${res.status}: ${redactError(text)}`,
          }
        }
        return { healthy: true, latencyMs: Date.now() - start }
      } catch (e) {
        return {
          healthy: false,
          latencyMs: Date.now() - start,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  }
}

function isRetryableFormatError(e: AIProviderError): boolean {
  const status = (e.cause as { status?: number } | undefined)?.status
  if (status !== 400 && status !== 422) return false
  return /response_format|json_object|json mode/i.test(e.message)
}

function extractJson(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // tolerate markdown fences / preamble around the JSON object
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('no JSON object found in response')
  }
}

function redactError(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9]+/g, 'sk-***')
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***')
    .slice(0, 500)
}
