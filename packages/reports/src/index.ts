export {
  type ReportType,
  type ReportStyle,
  type ReportClaim,
  type ReportEvidence,
  type ReportSection,
  type StructuredReport,
  type GenerateReportInput,
  type GenerateReportOutput,
  getDateRange,
  REPORT_TYPE_LABELS,
  REPORT_STYLE_LABELS,
} from './types.js'

export {
  rankEntriesByRelevance,
  groupByProject,
  buildEvidenceFromEntries,
  filterEntriesForReport,
} from './evidence.js'

export { createReportWriter } from './writer.js'
export type { ReportWriterDeps } from './writer.js'

export { reportToMarkdown, reportToText, reportToJson } from './render.js'
