import type {
  AIProvider,
  StructuredGenerationRequest,
  TextGenerationRequest,
  ProviderHealth,
} from '@appraiseme/contracts'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

export interface CreateOpenAIProviderOptions {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  embeddingModel?: string
}

export function createOpenAIProvider(
  opts: CreateOpenAIProviderOptions,
): AIProvider {
  const baseUrl = opts.baseUrl || 'https://api.openai.com/v1'
  const defaultModel = opts.defaultModel || 'gpt-4o'
  const embeddingModel = opts.embeddingModel || 'text-embedding-3-small'

  async function request<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after')
      throw new RateLimitError(
        'OpenAI rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined,
      )
    }

    if (!res.ok) {
      const text = await res.text()
      throw new AIProviderError(
        `OpenAI API error (${res.status}): ${redactError(text)}`,
        { status: res.status, provider: 'openai' },
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

      const data = await request<{
        choices: Array<{ message: { content: string } }>
      }>('/chat/completions', body)

      const content = data.choices[0]?.message?.content
      if (!content)
        throw new AIProviderError('OpenAI returned empty response', {
          provider: 'openai',
        })

      try {
        const parsed = JSON.parse(content)
        return req.parse(parsed)
      } catch (e) {
        throw new AIProviderError(
          `OpenAI response parse failed: ${e instanceof Error ? e.message : 'unknown'}`,
          { provider: 'openai' },
        )
      }
    },

    async *stream(req: TextGenerationRequest): AsyncIterable<string> {
      const res = await fetch(`${baseUrl}/chat/completions`, {
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
          `OpenAI stream error (${res.status}): ${redactError(text)}`,
          { status: res.status, provider: 'openai' },
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
              // skip malformed chunk
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

    async testConnection(): Promise<ProviderHealth> {
      const start = Date.now()
      try {
        await request('/models', {})
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
  return text.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***').slice(0, 500)
}
