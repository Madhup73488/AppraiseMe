import type {
  AIProvider,
  StructuredGenerationRequest,
  TextGenerationRequest,
  ProviderHealth,
} from '@appraiseme/contracts'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

export interface CreateGeminiProviderOptions {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
}

export function createGeminiProvider(
  opts: CreateGeminiProviderOptions,
): AIProvider {
  const baseUrl =
    opts.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
  const defaultModel = opts.defaultModel || 'gemini-1.5-flash'

  async function request<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}?key=${opts.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      throw new RateLimitError('Gemini rate limit exceeded')
    }

    if (!res.ok) {
      const text = await res.text()
      throw new AIProviderError(
        `Gemini API error (${res.status}): ${redactError(text)}`,
        { status: res.status, provider: 'gemini' },
      )
    }

    return res.json() as Promise<T>
  }

  return {
    async generate<T>(req: StructuredGenerationRequest<T>): Promise<T> {
      const model = req.model || defaultModel
      const data = await request<{
        candidates: Array<{
          content: { parts: Array<{ text: string }> }
        }>
      }>(`/models/${model}:generateContent`, {
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
        generationConfig: {
          temperature: req.temperature ?? 0.3,
          responseMimeType: 'application/json',
        },
      })

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text)
        throw new AIProviderError('Gemini returned empty response', {
          provider: 'gemini',
        })

      try {
        const parsed = JSON.parse(text)
        return req.parse(parsed)
      } catch (e) {
        throw new AIProviderError(
          `Gemini response parse failed: ${e instanceof Error ? e.message : 'unknown'}`,
          { provider: 'gemini' },
        )
      }
    },

    async *stream(req: TextGenerationRequest): AsyncIterable<string> {
      const model = req.model || defaultModel
      const res = await fetch(
        `${baseUrl}/models/${model}:streamGenerateContent?key=${opts.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
            generationConfig: {
              temperature: req.temperature ?? 0.3,
              maxOutputTokens: req.maxTokens,
            },
          }),
        },
      )

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new AIProviderError(
          `Gemini stream error (${res.status}): ${redactError(text)}`,
          { status: res.status, provider: 'gemini' },
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
          const trimmed = line.trim()
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              const chunks = JSON.parse(
                trimmed.endsWith(']') ? trimmed : trimmed + ']',
              )
              const arr = Array.isArray(chunks) ? chunks : [chunks]
              for (const chunk of arr) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) yield text
              }
            } catch {
              // skip
            }
          }
        }
      }
    },

    async embed(texts: string[]): Promise<number[][]> {
      const model = 'text-embedding-004'
      const data = await request<{
        embeddings: Array<{ values: number[] }>
      }>(`/models/${model}:batchEmbedContents`, {
        requests: texts.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        })),
      })
      return data.embeddings.map((e) => e.values)
    },

    async testConnection(): Promise<ProviderHealth> {
      const start = Date.now()
      try {
        await request(`/models/${defaultModel}:generateContent`, {
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 },
        })
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

function redactError(text: string): string {
  return text.replace(/AIza[a-zA-Z0-9_-]+/g, 'AIza***').slice(0, 500)
}
