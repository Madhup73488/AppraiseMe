import { describe, it, expect } from 'vitest'
import {
  getDateRange,
  REPORT_TYPE_LABELS,
  REPORT_STYLE_LABELS,
} from './types.js'
import {
  rankEntriesByRelevance,
  groupByProject,
  buildEvidenceFromEntries,
  filterEntriesForReport,
} from './evidence.js'
import { reportToMarkdown, reportToText } from './render.js'
import type { WorkEntryDTO } from '@appraiseme/contracts'
import type { StructuredReport } from './types.js'

function makeEntry(
  id: string,
  overrides: Partial<WorkEntryDTO> = {},
): WorkEntryDTO {
  return {
    id,
    ownerId: 'owner',
    projectId: null,
    content: `content ${id}`,
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

describe('getDateRange', () => {
  const ref = new Date(2024, 5, 15, 12, 0, 0)

  it('weekly covers the last 7 days', () => {
    const { from, to } = getDateRange('weekly', ref)
    const days =
      (new Date(to).getTime() - new Date(from).getTime()) /
      (1000 * 60 * 60 * 24)
    expect(days).toBeCloseTo(6.999, 1)
    expect(new Date(to).getHours()).toBe(23)
    expect(new Date(to).getMinutes()).toBe(59)
    expect(new Date(from).getHours()).toBe(0)
  })

  it('monthly starts on the first of the month', () => {
    const { from } = getDateRange('monthly', ref)
    expect(new Date(from).getDate()).toBe(1)
    expect(new Date(from).getMonth()).toBe(5)
  })

  it('quarterly starts on the quarter start', () => {
    const { from } = getDateRange('quarterly', ref)
    expect(new Date(from).getMonth()).toBe(3)
    expect(new Date(from).getDate()).toBe(1)
  })

  it('half_year picks the right semester', () => {
    const firstHalf = getDateRange('half_year', ref)
    expect(new Date(firstHalf.from).getMonth()).toBe(0)

    const secondHalf = getDateRange('half_year', new Date(2024, 7, 15))
    expect(new Date(secondHalf.from).getMonth()).toBe(6)
  })

  it('yearly starts January 1', () => {
    const { from } = getDateRange('yearly', ref)
    expect(new Date(from).getMonth()).toBe(0)
    expect(new Date(from).getDate()).toBe(1)
  })

  it('appraisal covers six months back', () => {
    const { from, to } = getDateRange('appraisal', ref)
    const months =
      (new Date(to).getFullYear() - new Date(from).getFullYear()) * 12 +
      (new Date(to).getMonth() - new Date(from).getMonth())
    expect(months).toBe(6)
  })

  it('labels are complete', () => {
    expect(Object.keys(REPORT_TYPE_LABELS)).toHaveLength(7)
    expect(Object.keys(REPORT_STYLE_LABELS)).toHaveLength(5)
  })
})

describe('evidence ranking', () => {
  it('ranks achievements and high-importance entries higher', () => {
    const ranked = rankEntriesByRelevance([
      makeEntry('plain'),
      makeEntry('achievement', { entryType: 'achievement' }),
      makeEntry('important', { importance: 3 }),
    ])

    expect(ranked[0]!.entry.id).toBe('achievement')
    expect(ranked[1]!.entry.id).toBe('important')
    expect(ranked[2]!.entry.id).toBe('plain')
  })

  it('builds evidence capped at maxEvidence', () => {
    const entries = Array.from({ length: 20 }, (_, i) => makeEntry(String(i)))
    const evidence = buildEvidenceFromEntries(
      entries.map((entry) => ({ entry, score: 1 })),
      5,
    )
    expect(evidence).toHaveLength(5)
    expect(evidence[0]).toMatchObject({
      entryId: '0',
      entryContent: 'content 0',
    })
  })
})

describe('groupByProject', () => {
  it('groups entries by project name', () => {
    const groups = groupByProject(
      [
        makeEntry('a', { projectId: 'p1' }),
        makeEntry('b', { projectId: 'p2' }),
        makeEntry('c', { projectId: 'p1' }),
        makeEntry('d'),
      ],
      new Map([
        ['p1', 'Alpha'],
        ['p2', 'Beta'],
      ]),
    )

    expect(groups.get('Alpha')!.map((e) => e.id)).toEqual(['a', 'c'])
    expect(groups.get('Beta')!.map((e) => e.id)).toEqual(['b'])
    expect(groups.get('Unassigned')!.map((e) => e.id)).toEqual(['d'])
  })
})

describe('filterEntriesForReport', () => {
  it('filters by date range and excludes deleted', () => {
    const filtered = filterEntriesForReport(
      [
        makeEntry('in', { occurredAt: '2024-06-10T00:00:00.000Z' }),
        makeEntry('out', { occurredAt: '2024-01-10T00:00:00.000Z' }),
        makeEntry('deleted', {
          occurredAt: '2024-06-11T00:00:00.000Z',
          deletedAt: '2024-06-12T00:00:00.000Z',
        }),
      ],
      '2024-06-01T00:00:00.000Z',
      '2024-06-30T00:00:00.000Z',
    )

    expect(filtered.map((e) => e.id)).toEqual(['in'])
  })
})

describe('rendering', () => {
  const report: StructuredReport = {
    title: 'Q2 Report',
    reportType: 'quarterly',
    dateFrom: '2024-04-01T00:00:00.000Z',
    dateTo: '2024-06-30T00:00:00.000Z',
    style: 'balanced',
    summary: 'A productive quarter.',
    sections: [
      {
        key: 'achievements',
        title: 'Key Achievements',
        claims: [
          {
            id: 'c2',
            sectionKey: 'achievements',
            claimText: 'Second claim',
            sortOrder: 2,
            evidence: [],
          },
          {
            id: 'c1',
            sectionKey: 'achievements',
            claimText: 'First claim',
            sortOrder: 1,
            evidence: [{ entryId: 'e1', relevance: 1 }],
          },
        ],
      },
    ],
  }

  it('renders markdown with header, summary, and evidence refs', () => {
    const md = reportToMarkdown(report)
    expect(md).toContain('# Q2 Report')
    expect(md).toContain('## Summary')
    expect(md).toContain('## Key Achievements')
    expect(md.indexOf('First claim')).toBeLessThan(md.indexOf('Second claim'))
    expect(md).toContain('e1')
  })

  it('renders plain text with section underlines', () => {
    const text = reportToText(report)
    expect(text).toContain('Q2 REPORT')
    expect(text).toContain('KEY ACHIEVEMENTS')
    expect(text).toContain('-'.repeat('KEY ACHIEVEMENTS'.length))
  })
})
