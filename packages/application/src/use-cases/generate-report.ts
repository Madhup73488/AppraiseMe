import type { WorklogStore, AIProvider } from '@appraiseme/contracts'
import {
  createReportWriter,
  filterEntriesForReport,
  rankEntriesByRelevance,
  getDateRange,
  type ReportType,
  type ReportStyle,
  type GenerateReportInput,
  type GenerateReportOutput,
} from '@appraiseme/reports'

export interface GenerateReportDeps {
  store: WorklogStore
  provider: AIProvider
  providerName: string
  modelName: string
}

export interface GenerateReportRequest {
  reportType: ReportType
  style?: ReportStyle
  dateFrom?: string
  dateTo?: string
}

export function createGenerateReportUseCase(deps: GenerateReportDeps) {
  const writer = createReportWriter({
    provider: deps.provider,
    providerName: deps.providerName,
    modelName: deps.modelName,
  })

  return async (
    request: GenerateReportRequest,
  ): Promise<{ reportId: string; output: GenerateReportOutput }> => {
    const dateRange =
      request.dateFrom && request.dateTo
        ? { from: request.dateFrom, to: request.dateTo }
        : getDateRange(request.reportType)

    const allEntries = await deps.store.entries.list({
      dateRange,
      limit: 1000,
    })

    const filtered = filterEntriesForReport(
      allEntries,
      dateRange.from,
      dateRange.to,
    )

    const ranked = rankEntriesByRelevance(filtered)

    const topEntries = ranked.slice(0, 50).map((re) => ({
      id: re.entry.id,
      content: re.entry.content,
      entryType: re.entry.entryType,
      occurredAt: re.entry.occurredAt,
      aiSummary: re.entry.aiSummary,
      projectName: null,
      importance: re.entry.importance,
    }))

    const writerInput: GenerateReportInput = {
      reportType: request.reportType,
      style: request.style || 'balanced',
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      entries: topEntries,
    }

    const output = await writer(writerInput)

    const report = await deps.store.reports.create({
      title: output.report.title,
      reportType: request.reportType,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      style: request.style || 'balanced',
    })

    return { reportId: report.id, output }
  }
}
