import { tokenize, extractPhrase } from './tokenizer.js'
import type { LexicalDocument, SearchHit, SearchIndex } from './types.js'

const CONTENT_WEIGHT = 1
const SUMMARY_WEIGHT = 0.6
const PHRASE_BONUS = 2

interface IndexedDoc {
  id: string
  termFrequencies: Map<string, number>
  totalTokens: number
  content: string
}

export function createInMemorySearchIndex(): SearchIndex {
  const docs = new Map<string, IndexedDoc>()
  const documentFrequencies = new Map<string, number>()

  function add(doc: LexicalDocument): void {
    remove(doc.id)

    const termFrequencies = new Map<string, number>()
    const contentTerms = tokenize(doc.content)
    for (const term of contentTerms) {
      termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1)
    }
    const summaryTerms = tokenize(doc.aiSummary || '')
    for (const term of summaryTerms) {
      termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1)
    }

    let totalTokens = 0
    const counted = new Set<string>()
    for (const [term, frequency] of termFrequencies) {
      totalTokens += frequency
      if (!counted.has(term)) {
        counted.add(term)
        documentFrequencies.set(term, (documentFrequencies.get(term) || 0) + 1)
      }
    }

    docs.set(doc.id, {
      id: doc.id,
      termFrequencies,
      totalTokens: totalTokens || 1,
      content: extractPhrase(doc.content),
    })
  }

  function remove(id: string): void {
    const existing = docs.get(id)
    if (!existing) return
    for (const term of existing.termFrequencies.keys()) {
      const count = documentFrequencies.get(term) || 0
      if (count <= 1) documentFrequencies.delete(term)
      else documentFrequencies.set(term, count - 1)
    }
    docs.delete(id)
  }

  function clear(): void {
    docs.clear()
    documentFrequencies.clear()
  }

  function size(): number {
    return docs.size
  }

  function idf(term: string): number {
    const df = documentFrequencies.get(term) || 0
    if (df === 0) return 0
    return Math.log(1 + docs.size / df)
  }

  function search(query: string, limit = 50): SearchHit[] {
    const queryTerms = tokenize(query)
    if (queryTerms.length === 0 || docs.size === 0) return []

    const phrase = extractPhrase(query)
    const hits: SearchHit[] = []

    for (const doc of docs.values()) {
      let score = 0
      const matchedTerms: string[] = []

      for (const term of new Set(queryTerms)) {
        const frequency = doc.termFrequencies.get(term)
        if (!frequency) continue
        matchedTerms.push(term)
        const tf = frequency / doc.totalTokens
        score += tf * idf(term)
      }

      if (matchedTerms.length === 0) continue

      if (phrase.length > 0 && containsPhrase(doc.content, phrase)) {
        score += PHRASE_BONUS
      }

      const coverage = matchedTerms.length / new Set(queryTerms).size
      score *= 0.5 + coverage

      hits.push({ id: doc.id, score, matchedTerms })
    }

    hits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.id.localeCompare(b.id)
    })

    return hits.slice(0, limit)
  }

  return { add, remove, clear, size, search }
}

function containsPhrase(normalizedContent: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(
    normalizedContent,
  )
}

export { CONTENT_WEIGHT, SUMMARY_WEIGHT, PHRASE_BONUS }
