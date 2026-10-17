export {
  normalizeText,
  tokenize,
  stemToken,
  extractPhrase,
} from './tokenizer.js'
export { createInMemorySearchIndex } from './lexical-index.js'
export { createLexicalSearchRepository } from './repository.js'
export type {
  EntrySource,
  LexicalSearchRepositoryOptions,
} from './repository.js'
export { snippetFor } from './snippet.js'
export type {
  SearchHit,
  LexicalDocument,
  SearchIndex,
  SearchOptions,
  HybridSearchEngine,
  SearchFiltersInput,
} from './types.js'
export { DEFAULT_SEARCH_LIMIT, DEFAULT_MIN_SCORE } from './types.js'
