import { describe, it, expect } from 'vitest'
import { normalizeText, tokenize, stemToken } from './tokenizer.js'
import { createInMemorySearchIndex } from './lexical-index.js'
import { snippetFor } from './snippet.js'

describe('tokenizer', () => {
  it('lowercases and splits on non-alphanumerics', () => {
    expect(tokenize('Fixed the Login-page bug!')).toEqual([
      'fix',
      'login',
      'page',
      'bug',
    ])
  })

  it('removes stop words', () => {
    expect(tokenize('the and or with to')).toEqual([])
  })

  it('strips diacritics', () => {
    expect(normalizeText('café résumé')).toBe('cafe resume')
  })

  it('stems simple plurals', () => {
    expect(stemToken('entries')).toBe('entry')
    expect(stemToken('bugs')).toBe('bug')
    expect(stemToken('classes')).toBe('class')
    expect(stemToken('pass')).toBe('pass')
  })

  it('stems past tense and progressive forms', () => {
    expect(stemToken('deployed')).toBe('deploy')
    expect(stemToken('deploying')).toBe('deploy')
    expect(stemToken('shipped')).toBe('ship')
    expect(stemToken('shipping')).toBe('ship')
    expect(stemToken('running')).toBe('run')
    expect(stemToken('fixed')).toBe('fix')
    expect(stemToken('applied')).toBe('apply')
    expect(stemToken('tried')).toBe('try')
    expect(stemToken('agreed')).toBe('agree')
  })

  it('handles empty input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('   !!! ')).toEqual([])
  })
})

describe('in-memory lexical index', () => {
  it('finds documents containing query terms', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'Refactored the React components' })
    index.add({ id: '2', content: 'Wrote database migration script' })

    const hits = index.search('react')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.id).toBe('1')
    expect(hits[0]!.matchedTerms).toContain('react')
  })

  it('matches plurals and case variants', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'Shipped the payment Reports' })

    const hits = index.search('report')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.id).toBe('1')
  })

  it('ranks more relevant documents higher', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'deploy deploy deploy pipeline' })
    index.add({ id: '2', content: 'deploy mentioned once in a long document' })
    index.add({ id: '3', content: 'unrelated content entirely' })

    const hits = index.search('deploy')
    expect(hits[0]!.id).toBe('1')
    expect(hits).toHaveLength(2)
  })

  it('rewards full phrase matches', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'fixed login page bug' })
    index.add({
      id: '2',
      content: 'login bug on the page was fixed after login',
    })

    const hits = index.search('login bug')
    expect(hits[0]!.id).toBe('2')
  })

  it('gives higher score to multi-term matches', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'fixed login bug' })
    index.add({ id: '2', content: 'fixed unrelated thing' })

    const hits = index.search('login bug')
    expect(hits[0]!.id).toBe('1')
  })

  it('returns empty for no matches', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'some content' })
    expect(index.search('zzz_nonexistent')).toEqual([])
  })

  it('returns empty for stop-word-only queries', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'some content' })
    expect(index.search('the and of')).toEqual([])
  })

  it('supports remove and clear', () => {
    const index = createInMemorySearchIndex()
    index.add({ id: '1', content: 'alpha beta' })
    index.add({ id: '2', content: 'alpha gamma' })
    expect(index.size()).toBe(2)

    index.remove('1')
    expect(index.size()).toBe(1)
    expect(index.search('beta')).toEqual([])

    index.clear()
    expect(index.size()).toBe(0)
    expect(index.search('alpha')).toEqual([])
  })

  it('respects the limit', () => {
    const index = createInMemorySearchIndex()
    for (let i = 0; i < 10; i++) {
      index.add({ id: String(i), content: `deploy task number ${i}` })
    }
    expect(index.search('deploy', 3)).toHaveLength(3)
  })

  it('indexes ai summaries when provided', () => {
    const index = createInMemorySearchIndex()
    index.add({
      id: '1',
      content: 'meeting notes',
      aiSummary: 'kubernetes rollout',
    })
    index.add({
      id: '2',
      content: 'kubernetes rollout planning',
      aiSummary: null,
    })

    const hits = index.search('kubernetes')
    expect(hits).toHaveLength(2)
  })
})

describe('snippetFor', () => {
  it('returns content shorter than max length unchanged', () => {
    expect(snippetFor('short text', 'text')).toBe('short text')
  })

  it('centers snippet on first match and adds ellipses', () => {
    const content =
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod'
    const snippet = snippetFor(content, 'consectetur', 20)
    expect(snippet.startsWith('…')).toBe(true)
    expect(snippet.endsWith('…')).toBe(true)
    expect(snippet.toLowerCase()).toContain('consectetur')
  })

  it('returns start of content when no match', () => {
    const content = 'A'.repeat(300)
    const snippet = snippetFor(content, 'zzz', 50)
    expect(snippet.length).toBeLessThanOrEqual(52)
  })
})
