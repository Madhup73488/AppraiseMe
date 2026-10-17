import type {
  AIProvider,
  StructuredGenerationRequest,
} from '@appraiseme/contracts'

export interface RephraseVoiceTranscriptOptions {
  model?: string
}

const REPHRASE_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
  },
  required: ['content'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `You are a writing assistant inside a professional work-journal app. The user dictated a work note by voice and the raw speech-to-text transcript is given to you. Rewrite it as a clean, professional task description.

Rules:
- Preserve the original meaning — NEVER invent facts, names, numbers, dates, or deadlines that were not spoken
- Remove filler words ("um", "uh", "like", "you know"), repeats, and false starts
- Fix grammar, spelling, and punctuation
- Keep it concise: 1-3 sentences in clear professional English
- Keep any names, ticket IDs, or specifics exactly as spoken
- If the transcript is already clean, return it with only minor polish
Return JSON: {"content": "<rewritten text>"}`

/**
 * Rewrites a raw voice transcript into polished task content using the
 * connected AI provider. Throws on provider/parse failure — callers should
 * fall back to the raw transcript.
 */
export async function rephraseVoiceTranscript(
  transcript: string,
  provider: AIProvider,
  opts?: RephraseVoiceTranscriptOptions,
): Promise<string> {
  const request: StructuredGenerationRequest<string> = {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Rewrite this voice transcript:\n\n${transcript}`,
    schema: REPHRASE_SCHEMA,
    model: opts?.model,
    temperature: 0.3,
    parse: (value: unknown) => {
      const v = value as Record<string, unknown>
      const content = typeof v.content === 'string' ? v.content.trim() : ''
      if (!content) throw new Error('rephrase returned empty content')
      return content
    },
  }

  return provider.generate(request)
}
