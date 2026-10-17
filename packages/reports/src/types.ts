export type ReportType =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'half_year'
  | 'yearly'
  | 'custom'
  | 'appraisal'

export type ReportStyle =
  'concise' | 'detailed' | 'leadership' | 'impact' | 'balanced'

export interface ReportClaim {
  id: string
  sectionKey: string
  claimText: string
  sortOrder: number
  evidence: ReportEvidence[]
}

export interface ReportEvidence {
  entryId: string
  relevance: number
  entryContent?: string
  entryOccurredAt?: string
}

export interface ReportSection {
  key: string
  title: string
  claims: ReportClaim[]
}

export interface StructuredReport {
  title: string
  reportType: ReportType
  dateFrom: string
  dateTo: string
  style: ReportStyle
  summary: string
  sections: ReportSection[]
}

export interface GenerateReportInput {
  reportType: ReportType
  style: ReportStyle
  dateFrom: string
  dateTo: string
  entries: Array<{
    id: string
    content: string
    entryType: string
    occurredAt: string
    aiSummary: string | null
    projectName: string | null
    importance: number
  }>
}

export interface GenerateReportOutput {
  report: StructuredReport
  provider: string
  model: string
  promptVersion: string
  generatedAt: string
}

export function getDateRange(
  reportType: ReportType,
  referenceDate?: Date,
): { from: string; to: string } {
  const ref = referenceDate || new Date()
  const to = new Date(ref)
  to.setHours(23, 59, 59, 999)

  switch (reportType) {
    case 'weekly': {
      const from = new Date(to)
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'monthly': {
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'quarterly': {
      const quarter = Math.floor(to.getMonth() / 3)
      const from = new Date(to.getFullYear(), quarter * 3, 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'half_year': {
      const from = new Date(to.getFullYear(), 0, 1)
      if (to.getMonth() >= 6) from.setMonth(6)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'yearly': {
      const from = new Date(to.getFullYear(), 0, 1)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    case 'appraisal': {
      const from = new Date(to)
      from.setMonth(from.getMonth() - 6)
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    default:
      return { from: to.toISOString(), to: to.toISOString() }
  }
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_year: 'Half-Year',
  yearly: 'Yearly',
  custom: 'Custom',
  appraisal: 'Appraisal',
}

export const REPORT_STYLE_LABELS: Record<ReportStyle, string> = {
  concise: 'Concise',
  detailed: 'Detailed',
  leadership: 'Leadership',
  impact: 'Impact',
  balanced: 'Balanced',
}
