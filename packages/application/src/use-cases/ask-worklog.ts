import type { AIProvider, WorklogStore } from '@appraiseme/contracts'

export interface AskWorklogDeps {
  store: WorklogStore
  provider: AIProvider
}

export interface AskWorklogResult {
  answer: string
  entryCount: number
}

const MAX_CONTEXT_ENTRIES = 100

export function createAskWorklogUseCase(deps: AskWorklogDeps) {
  return async (question: string): Promise<AskWorklogResult> => {
    const trimmed = question.trim()
    if (!trimmed) throw new Error('Question is required')

    const entries = await deps.store.entries.list({
      limit: MAX_CONTEXT_ENTRIES,
    })

    if (entries.length === 0) {
      return {
        answer:
          'There are no work entries yet. Capture a few entries first, then ask again.',
        entryCount: 0,
      }
    }

    const context = entries
      .map((e) => {
        const text = e.aiSummary || e.content
        return `- [${e.occurredAt}] (${e.entryType}) ${text}`
      })
      .join('\n')

    const result = await deps.provider.generate({
      systemPrompt:
        'You answer questions about the user professional work log. ' +
        'Use only the provided entries as evidence. If the entries do not ' +
        'contain the answer, say so plainly and suggest what to capture. ' +
        'Be concise and concrete; cite dates where relevant.',
      userPrompt: `Work log entries (most recent first):\n\n${context}\n\nQuestion: ${trimmed}`,
      schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
      },
      temperature: 0.2,
      parse: (v: unknown) => v as { answer: string },
    })

    return {
      answer:
        typeof result.answer === 'string' && result.answer.length > 0
          ? result.answer
          : 'No answer was returned.',
      entryCount: entries.length,
    }
  }
}
