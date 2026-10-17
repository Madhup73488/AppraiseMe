import { describe, it, expect } from 'vitest'
import { createLexicalSearchRepository } from './repository.js'
import type { WorkEntryDTO } from '@appraiseme/contracts'

function makeEntry(
  id: string,
  content: string,
  overrides: Partial<WorkEntryDTO> = {},
): WorkEntryDTO {
  return {
    id,
    ownerId: 'owner',
    projectId: null,
    content,
    contentPlain: null,
    entryType: 'task',
    status: 'active',
    importance: 0,
    source: 'manual',
    occurredAt: '2024-06-01T00:00:00.000Z',
    aiStatus: 'pending',
    aiSummary: null,
    aiMetadata: {},
    version: 1,
    deviceId: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function makeSource(entries: WorkEntryDTO[]) {
  return {
    entries: {
      async list(input: {
        dateRange?: { from: string; to: string }
        projectId?: string
        entryType?: string
      }) {
        return entries.filter((e) => {
          if (input.projectId && e.projectId !== input.projectId) return false
          if (input.entryType && e.entryType !== input.entryType) return false
          if (
            input.dateRange &&
            (e.occurredAt < input.dateRange.from ||
              e.occurredAt > input.dateRange.to)
          )
            return false
          return true
        })
      },
    },
  }
}

describe('lexical search repository', () => {
  it('returns ranked entries matching the query', async () => {
    const entries = [
      makeEntry('1', 'Deployed the payment service'),
      makeEntry('2', 'deploy deploy deploy pipelines'),
      makeEntry('3', 'Reviewed marketing copy'),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))

    const results = await repo.search('deploy')
    expect(results.map((e) => e.id)).toEqual(['2', '1'])
  })

  it('returns empty array for no matches', async () => {
    const repo = createLexicalSearchRepository(
      makeSource([makeEntry('1', 'some content')]),
    )
    expect(await repo.search('zzz_nonexistent')).toEqual([])
  })

  it('applies projectId filter', async () => {
    const entries = [
      makeEntry('1', 'deploy work', { projectId: 'p1' }),
      makeEntry('2', 'deploy work', { projectId: 'p2' }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))

    const results = await repo.search('deploy', { projectId: 'p1' })
    expect(results.map((e) => e.id)).toEqual(['1'])
  })

  it('applies entryType filter', async () => {
    const entries = [
      makeEntry('1', 'deploy work', { entryType: 'meeting' }),
      makeEntry('2', 'deploy work', { entryType: 'task' }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))

    const results = await repo.search('deploy', { entryType: 'task' })
    expect(results.map((e) => e.id)).toEqual(['2'])
  })

  it('applies dateRange filter', async () => {
    const entries = [
      makeEntry('1', 'deploy work', {
        occurredAt: '2024-01-15T00:00:00.000Z',
      }),
      makeEntry('2', 'deploy work', {
        occurredAt: '2024-03-15T00:00:00.000Z',
      }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))

    const results = await repo.search('deploy', {
      dateRange: {
        from: '2024-02-01T00:00:00.000Z',
        to: '2024-04-01T00:00:00.000Z',
      },
    })
    expect(results.map((e) => e.id)).toEqual(['2'])
  })

  it('excludes deleted entries', async () => {
    const entries = [
      makeEntry('1', 'deploy work'),
      makeEntry('2', 'deploy work', { deletedAt: '2024-06-02T00:00:00.000Z' }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))

    const results = await repo.search('deploy')
    expect(results.map((e) => e.id)).toEqual(['1'])
  })

  it('does not match ai summaries by default', async () => {
    const entries = [
      makeEntry('1', 'standup notes', { aiSummary: 'kubernetes rollout' }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries))
    expect(await repo.search('kubernetes')).toEqual([])
  })

  it('matches ai summaries when includeSummary is enabled', async () => {
    const entries = [
      makeEntry('1', 'standup notes', { aiSummary: 'kubernetes rollout' }),
    ]
    const repo = createLexicalSearchRepository(makeSource(entries), {
      includeSummary: true,
    })
    const results = await repo.search('kubernetes')
    expect(results.map((e) => e.id)).toEqual(['1'])
  })
})
