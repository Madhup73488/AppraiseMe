import type { WorklogStore, ReportDTO } from '@appraiseme/contracts'

export interface ListReportsDeps {
  store: WorklogStore
}

export function createListReportsUseCase(deps: ListReportsDeps) {
  return async (): Promise<ReportDTO[]> => deps.store.reports.list()
}

export function createGetReportUseCase(deps: ListReportsDeps) {
  return async (id: string): Promise<ReportDTO | null> =>
    deps.store.reports.getById(id)
}
