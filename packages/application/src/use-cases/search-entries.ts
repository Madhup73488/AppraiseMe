import type {
  WorklogStore,
  WorkEntryDTO,
  SearchFilters,
} from '@appraiseme/contracts'

export interface SearchEntriesDeps {
  store: WorklogStore
}

export function createSearchEntriesUseCase(deps: SearchEntriesDeps) {
  return async (
    query: string,
    filters?: SearchFilters,
  ): Promise<WorkEntryDTO[]> => {
    // tag filtering happens in-application: tags live inside aiMetadata
    // (JSON), and adapters differ in JSON query support. Fetch a wider page,
    // then filter, then trim.
    if (!filters?.tag) {
      return deps.store.search.search(query, filters)
    }
    const tag = filters.tag
    const { tag: _tag, ...rest } = filters
    void _tag
    const results = await deps.store.search.search(query, {
      ...rest,
      limit: Math.max(rest.limit ?? 50, 200),
    })
    return results.filter((e) => {
      const tags = e.aiMetadata?.['suggested_tags']
      return Array.isArray(tags) && tags.map(String).includes(tag)
    })
  }
}
