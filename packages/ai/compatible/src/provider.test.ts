import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCompatibleProvider } from './provider.js'
import { RateLimitError, AIProviderError } from '@appraiseme/domain'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function completion(content: string): Response {
  return jsonResponse({
    choices: [{ message: { content } }],
  })
}

const req = {
  systemPrompt: 'Return JSON',
  userPrompt: 'Summarize this',
  schema: { type: 'object' },
  parse: (v: unknown) => v as { summary: string },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createCompatibleProvider', () => {
  it('posts to {baseUrl}/chat/completions with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"summary":"ok"}'))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    const result = await provider.generate(req)

    expect(result).toEqual({ summary: 'ok' })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/chat/completions',
    )
    const init = fetchMock.mock.calls[0]?.[1]
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk-test',
    )
  })

  it('falls back to /v1 prefix when primary path 404s and remembers it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404))
      .mockResolvedValueOnce(completion('{"summary":"v1"}'))
      .mockResolvedValueOnce(completion('{"summary":"again"}'))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    await provider.generate(req)
    const second = await provider.generate(req)

    expect(second).toEqual({ summary: 'again' })
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toEqual([
      'http://localhost:8000/chat/completions',
      'http://localhost:8000/v1/chat/completions',
      'http://localhost:8000/v1/chat/completions',
    ])
  })

  it('retries without response_format when backend rejects it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: 'response_format is not supported' }, 400),
      )
      .mockResolvedValueOnce(completion('```json\n{"summary":"plain"}\n```'))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    const result = await provider.generate(req)

    expect(result).toEqual({ summary: 'plain' })
    const secondBody = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}'),
    )
    expect(secondBody.response_format).toBeUndefined()
  })

  it('throws RateLimitError on 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'rate limited' }, 429)),
    )

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    await expect(provider.generate(req)).rejects.toBeInstanceOf(RateLimitError)
  })

  it('reports unhealthy when testConnection gets a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'bad key' }, 401)),
    )

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    const health = await provider.testConnection()

    expect(health.healthy).toBe(false)
    expect(health.error).toContain('401')
  })

  it('reports healthy and probes /models on testConnection', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ id: 'gpt-5.5' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    const health = await provider.testConnection()

    expect(health.healthy).toBe(true)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/models')
  })

  it('transcribes audio via /audio/transcriptions multipart', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ text: ' fixed the login bug ' }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    const audio = new Blob(['fake-webm-bytes'], { type: 'audio/webm' })
    const text = await provider.transcribeAudio!(audio, 'whisper-1')

    expect(text).toBe(' fixed the login bug ')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://localhost:8000/audio/transcriptions',
    )
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk-test',
    )
    expect(init.body).toBeInstanceOf(FormData)
    const form = init.body as FormData
    expect(form.get('model')).toBe('whisper-1')
    expect(form.get('file')).toBeInstanceOf(Blob)
  })

  it('throws AIProviderError when transcription returns no text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ text: '' })),
    )

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    await expect(
      provider.transcribeAudio!(new Blob(['x'])),
    ).rejects.toBeInstanceOf(AIProviderError)
  })

  it('wraps parse failures in AIProviderError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(completion('not json at all')),
    )

    const provider = createCompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:8000',
    })
    await expect(provider.generate(req)).rejects.toBeInstanceOf(
      AIProviderError,
    )
  })
})
