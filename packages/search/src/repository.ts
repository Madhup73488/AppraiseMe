import type {
  SearchRepository,
  WorkEntryDTO,
  SearchFilters,
  ListEntriesInput,
} from '@appraiseme/contracts'
import { createInMemorySearchIndex } from './lexical-index.js'
import type { SearchOptions } from './types.js'

export interface EntrySource {
  entries: {
    list(input: ListEntriesInput): Promise<WorkEntryDTO[]>
  }
}

export interface LexicalSearchRepositoryOptions extends SearchOptions {
  includeSummary?: boolean
}

export function createLexicalSearchRepository(
  source: EntrySource,
  options: LexicalSearchRepositoryOptions = {},
): SearchRepository {
  const includeSummary = options.includeSummary ?? false
  const limit = options.limit ?? 50
  const minScore = options.minScore ?? 0

  return {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      const listInput: ListEntriesInput = {}
      if (filters?.dateRange) listInput.dateRange = filters.dateRange
      if (filters?.projectId) listInput.projectId = filters.projectId
      if (filters?.entryType) listInput.entryType = filters.entryType

      const entries = await source.entries.list(listInput)
      if (entries.length === 0) return []

      const index = createInMemorySearchIndex()
      const byId = new Map<string, WorkEntryDTO>()
      for (const entry of entries) {
        if (entry.deletedAt) continue
        byId.set(entry.id, entry)
        index.add({
          id: entry.id,
          content: entry.content,
          aiSummary: includeSummary ? entry.aiSummary : null,
        })
      }

      const hits = index.search(query, limit)
      const results: WorkEntryDTO[] = []
      for (const hit of hits) {
        if (hit.score < minScore) continue
        const entry = byId.get(hit.id)
        if (entry) results.push(entry)
      }
      return results
    },
  }
}
