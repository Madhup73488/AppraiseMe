import { describe, it, expect } from 'vitest'
import { exportReport, copyToClipboard } from './index.js'
import type { StructuredReport } from '@appraiseme/reports'

const report: StructuredReport = {
  title: 'My Weekly Report',
  reportType: 'weekly',
  dateFrom: '2024-06-03T00:00:00.000Z',
  dateTo: '2024-06-09T00:00:00.000Z',
  style: 'concise',
  summary: 'Good week.',
  sections: [
    {
      key: 'achievements',
      title: 'Achievements',
      claims: [
        {
          id: 'c1',
          sectionKey: 'achievements',
          claimText: 'Shipped the release',
          sortOrder: 0,
          evidence: [],
        },
      ],
    },
  ],
}

describe('exportReport', () => {
  it('exports markdown with proper filename and mime type', async () => {
    const result = await exportReport(report, { format: 'markdown' })
    expect(result.format).toBe('markdown')
    expect(result.mimeType).toBe('text/markdown')
    expect(result.filename).toBe('my-weekly-report.md')
    expect(result.content).toContain('# My Weekly Report')
    expect(result.content).toContain('- Shipped the release')
  })

  it('exports plain text', async () => {
    const result = await exportReport(report, { format: 'text' })
    expect(result.mimeType).toBe('text/plain')
    expect(result.filename).toBe('my-weekly-report.txt')
    expect(result.content).toContain('MY WEEKLY REPORT')
  })

  it('exports json containing the full report', async () => {
    const result = await exportReport(report, { format: 'json' })
    expect(result.mimeType).toBe('application/json')
    expect(result.filename).toBe('my-weekly-report.json')
    expect(JSON.parse(result.content as string)).toEqual(report)
  })

  it('respects a custom filename', async () => {
    const result = await exportReport(report, {
      format: 'markdown',
      filename: 'custom-name',
    })
    expect(result.filename).toBe('custom-name.md')
  })

  it('sanitizes unsafe characters out of generated filenames', async () => {
    const weird: StructuredReport = {
      ...report,
      title: 'Q2/Review: Impact & More!!',
    }
    const result = await exportReport(weird, { format: 'text' })
    expect(result.filename).toMatch(/^[a-z0-9-]+\.txt$/)
    expect(result.filename).not.toContain('/')
  })

  it('falls back to a default filename for empty titles', async () => {
    const empty: StructuredReport = { ...report, title: '!!!' }
    const result = await exportReport(empty, { format: 'text' })
    expect(result.filename).toBe('report.txt')
  })

  it('exports a PDF with a valid header and filename', async () => {
    const result = await exportReport(report, { format: 'pdf' })
    expect(result.format).toBe('pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.filename).toBe('my-weekly-report.pdf')
    const bytes = result.content as Uint8Array
    const header = new TextDecoder().decode(bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(500)
  })

  it('exports a DOCX that is a valid zip archive', async () => {
    const result = await exportReport(report, { format: 'docx' })
    expect(result.format).toBe('docx')
    expect(result.filename).toBe('my-weekly-report.docx')
    const bytes = result.content as Uint8Array
    expect(bytes[0]).toBe(0x50) // P
    expect(bytes[1]).toBe(0x4b) // K
    expect(bytes.length).toBeGreaterThan(500)
  })

  it('handles non-latin characters in PDF exports without throwing', async () => {
    const unicode: StructuredReport = {
      ...report,
      summary: 'Résumé — “quotes” and emoji 🎉 mixed',
      sections: [
        {
          key: 'wins',
          title: 'Wins',
          claims: [
            {
              id: 'c1',
              sectionKey: 'wins',
              claimText: '同比增长 40% — great quarter',
              sortOrder: 0,
              evidence: [],
            },
          ],
        },
      ],
    }
    const result = await exportReport(unicode, { format: 'pdf' })
    expect(new TextDecoder().decode((result.content as Uint8Array).slice(0, 5))).toBe(
      '%PDF-',
    )
  })
})

describe('copyToClipboard', () => {
  it('returns false when clipboard is unavailable', async () => {
    expect(await copyToClipboard('text')).toBe(false)
  })
})
