import type { StructuredReport, ReportClaim } from './types.js'

export function reportToMarkdown(report: StructuredReport): string {
  const lines: string[] = []

  lines.push(`# ${report.title}`)
  lines.push('')
  lines.push(
    `**Period:** ${formatDate(report.dateFrom)} — ${formatDate(report.dateTo)}`,
  )
  lines.push(`**Style:** ${report.style}`)
  lines.push('')

  if (report.summary) {
    lines.push('## Summary')
    lines.push('')
    lines.push(report.summary)
    lines.push('')
  }

  for (const section of report.sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    for (const claim of sortClaims(section.claims)) {
      lines.push(`- ${claim.claimText}`)
      if (claim.evidence.length > 0) {
        const evidenceIds = claim.evidence.map((e) => e.entryId).join(', ')
        lines.push(`  *(Evidence: ${evidenceIds})*`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function reportToText(report: StructuredReport): string {
  const lines: string[] = []

  lines.push(report.title.toUpperCase())
  lines.push('='.repeat(report.title.length))
  lines.push('')
  lines.push(
    `Period: ${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`,
  )
  lines.push(`Style: ${report.style}`)
  lines.push('')

  if (report.summary) {
    lines.push('SUMMARY')
    lines.push(report.summary)
    lines.push('')
  }

  for (const section of report.sections) {
    lines.push(section.title.toUpperCase())
    lines.push('-'.repeat(section.title.length))
    for (const claim of sortClaims(section.claims)) {
      lines.push(`  - ${claim.claimText}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function reportToJson(report: StructuredReport): string {
  return JSON.stringify(report, null, 2)
}

function sortClaims(claims: ReportClaim[]): ReportClaim[] {
  return [...claims].sort((a, b) => a.sortOrder - b.sortOrder)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
