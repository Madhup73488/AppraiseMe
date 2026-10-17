import type {
  AIProvider,
  StructuredGenerationRequest,
  TextGenerationRequest,
  ProviderHealth,
} from '@appraiseme/contracts'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

export interface CreateAnthropicProviderOptions {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
}

export function createAnthropicProvider(
  opts: CreateAnthropicProviderOptions,
): AIProvider {
  const baseUrl = opts.baseUrl || 'https://api.anthropic.com'
  const defaultModel = opts.defaultModel || 'claude-3-5-sonnet-20241022'
  const apiVersion = '2023-06-01'

  async function request<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': apiVersion,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after')
      throw new RateLimitError(
        'Anthropic rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined,
      )
    }

    if (!res.ok) {
      const text = await res.text()
      throw new AIProviderError(
        `Anthropic API error (${res.status}): ${redactError(text)}`,
        { status: res.status, provider: 'anthropic' },
      )
    }

    return res.json() as Promise<T>
  }

  return {
    async generate<T>(req: StructuredGenerationRequest<T>): Promise<T> {
      const data = await request<{
        content: Array<{ type: string; text: string }>
      }>('/v1/messages', {
        model: req.model || defaultModel,
        max_tokens: 1024,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
        temperature: req.temperature ?? 0.3,
      })

      const text = data.content?.find((c) => c.type === 'text')?.text
      if (!text)
        throw new AIProviderError('Anthropic returned empty response', {
          provider: 'anthropic',
        })

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
        return req.parse(parsed)
      } catch (e) {
        throw new AIProviderError(
          `Anthropic response parse failed: ${e instanceof Error ? e.message : 'unknown'}`,
          { provider: 'anthropic' },
        )
      }
    },

    async *stream(req: TextGenerationRequest): AsyncIterable<string> {
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': apiVersion,
        },
        body: JSON.stringify({
          model: req.model || defaultModel,
          max_tokens: req.maxTokens || 1024,
          system: req.systemPrompt,
          messages: [{ role: 'user', content: req.userPrompt }],
          temperature: req.temperature ?? 0.3,
          stream: true,
        }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new AIProviderError(
          `Anthropic stream error (${res.status}): ${redactError(text)}`,
          { status: res.status, provider: 'anthropic' },
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
            try {
              const chunk = JSON.parse(line.slice(6))
              if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                yield chunk.delta.text
              }
            } catch {
              // skip
            }
          }
        }
      }
    },

    async testConnection(): Promise<ProviderHealth> {
      const start = Date.now()
      try {
        await request('/v1/messages', {
          model: defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
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
  return text.replace(/sk-ant-[a-zA-Z0-9-]+/g, 'sk-ant-***').slice(0, 500)
}
