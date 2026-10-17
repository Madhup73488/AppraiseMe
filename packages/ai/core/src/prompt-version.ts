export const PROMPT_VERSION = '1'

export interface PromptMetadata {
  provider: string
  model: string
  promptVersion: string
  generatedAt: string
  sourceEntryIds: string[]
  contentHash?: string
}

export function createPromptMetadata(
  provider: string,
  model: string,
  sourceEntryIds: string[],
  contentHash?: string,
): PromptMetadata {
  return {
    provider,
    model,
    promptVersion: PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    sourceEntryIds,
    contentHash,
  }
}
