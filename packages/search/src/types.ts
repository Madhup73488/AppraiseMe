export interface SearchHit<ID = string> {
  id: ID
  score: number
  matchedTerms: string[]
}

export interface LexicalDocument {
  id: string
  content: string
  aiSummary?: string | null
}

export interface SearchIndex {
  add(doc: LexicalDocument): void
  remove(id: string): void
  clear(): void
  size(): number
  search(query: string, limit?: number): SearchHit[]
}

export interface SearchOptions {
  limit?: number
  minScore?: number
}

export interface HybridSearchEngine {
  search(
    query: string,
    filters?: SearchFiltersInput,
    options?: SearchOptions,
  ): Promise<SearchHit[]>
}

export interface SearchFiltersInput {
  dateRange?: { from: string; to: string }
  projectId?: string
  entryType?: string
}

export const DEFAULT_SEARCH_LIMIT = 50
export const DEFAULT_MIN_SCORE = 0.05
