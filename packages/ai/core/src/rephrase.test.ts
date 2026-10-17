import { describe, it, expect, vi } from 'vitest'
import { rephraseVoiceTranscript } from './rephrase.js'
import type {
  AIProvider,
  StructuredGenerationRequest,
} from '@appraiseme/contracts'

function mockProvider(
  content: string,
  seen: StructuredGenerationRequest<unknown>[] = [],
): AIProvider {
  return {
    generate: vi.fn().mockImplementation(
      async (req: StructuredGenerationRequest<unknown>) => {
        seen.push(req)
        return req.parse({ content })
      },
    ),
    testConnection: vi.fn().mockResolvedValue({ healthy: true }),
  }
}

describe('rephraseVoiceTranscript', () => {
  it('returns the polished content from the provider', async () => {
    const provider = mockProvider(
      'Fix the login timeout bug in the auth service.',
    )
    const result = await rephraseVoiceTranscript(
      'um so I need to fix the login timeout bug in the auth service',
      provider,
    )

    expect(result).toBe('Fix the login timeout bug in the auth service.')
    expect(provider.generate).toHaveBeenCalledOnce()
  })

  it('passes the transcript as the user prompt with the model override', async () => {
    const seen: StructuredGenerationRequest<unknown>[] = []
    const provider = mockProvider('polished', seen)
    await rephraseVoiceTranscript('fix login bug', provider, {
      model: 'test-model',
    })

    expect(seen[0]?.userPrompt).toContain('fix login bug')
    expect(seen[0]?.model).toBe('test-model')
  })

  it('throws when the provider returns empty content', async () => {
    const provider = mockProvider('   ')
    await expect(rephraseVoiceTranscript('something', provider)).rejects.toThrow(
      'empty content',
    )
  })
})
