import type {
  WorklogStore,
  WorkEntryDTO,
  UpdateEntryInput,
  AIProvider,
} from '@appraiseme/contracts'
import type { OutboxStore } from '@appraiseme/sync'
import {
  createEntryEnricher,
  type EnrichmentOutput,
  type EnrichmentResult,
  type PromptMetadata,
} from '@appraiseme/ai-core'
import { AIProviderError, RateLimitError } from '@appraiseme/domain'

export interface EnrichEntryDeps {
  store: WorklogStore
  provider: AIProvider
  providerName: string
  modelName: string
  outbox?: OutboxStore
  maxRetries?: number
}

function buildEnrichmentUpdate(
  entry: WorkEntryDTO,
  result: EnrichmentResult,
  metadata: PromptMetadata,
): UpdateEntryInput {
  return {
    content: entry.content,
    entryType: result.entryType,
    importance: entry.importance,
    status: entry.status,
    aiStatus: 'completed',
    aiSummary: result.summary,
    aiMetadata: {
      ...entry.aiMetadata,
      content_hash: metadata.contentHash ?? entry.aiMetadata?.content_hash,
      prompt_version: metadata.promptVersion,
      provider: metadata.provider,
      model: metadata.model,
      generated_at: metadata.generatedAt,
      suggested_project: result.suggestedProject,
      suggested_tags: result.suggestedTags,
      qualitative_impact: result.qualitativeImpact,
      achievement_association: result.achievementAssociation,
      confidence: result.confidence,
    },
  }
}

function buildFailureUpdate(
  entry: WorkEntryDTO,
  error: Error,
): UpdateEntryInput {
  return {
    content: entry.content,
    entryType: entry.entryType,
    importance: entry.importance,
    status: entry.status,
    aiStatus: 'failed',
    aiMetadata: {
      ...entry.aiMetadata,
      last_error: error.message,
    },
  }
}

export function createEnrichEntryUseCase(deps: EnrichEntryDeps) {
  const enricher = createEntryEnricher({
    provider: deps.provider,
    providerName: deps.providerName,
    modelName: deps.modelName,
  })
  const maxRetries = deps.maxRetries ?? 3

  async function applyUpdate(
    entryId: string,
    input: UpdateEntryInput,
  ): Promise<WorkEntryDTO> {
    if (deps.outbox) {
      return deps.store.transaction(async (tx) => {
        const updated = await tx.entries.update(entryId, input)
        await deps.outbox!.enqueue({
          entityType: 'work_entry',
          entityId: updated.id,
          operation: 'update',
          payload: JSON.stringify({ entry: updated }),
        })
        return updated
      })
    }
    return deps.store.entries.update(entryId, input)
  }

  return async (entryId: string): Promise<EnrichmentOutput> => {
    const entry = await deps.store.entries.getById(entryId)
    if (!entry) throw new Error(`Entry ${entryId} not found`)

    const existingHash = (entry.aiMetadata?.content_hash as string) || null

    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const output = await enricher({
          entryId,
          content: entry.content,
          existingSummary: entry.aiSummary,
          existingContentHash: existingHash,
        })

        if (!output.skipped) {
          await applyUpdate(
            entryId,
            buildEnrichmentUpdate(entry, output.result, output.metadata),
          )
        }

        return output
      } catch (e) {
        lastError = e as Error

        if (e instanceof RateLimitError) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }

        if (e instanceof AIProviderError) {
          break
        }

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
      }
    }

    const failure = lastError || new Error('Enrichment failed')
    await applyUpdate(entryId, buildFailureUpdate(entry, failure))
    throw failure
  }
}
