import type { WorkEntryDTO } from '@appraiseme/contracts'
import type { ReportEvidence } from './types.js'

export interface RankedEntry {
  entry: WorkEntryDTO
  score: number
}

export function rankEntriesByRelevance(entries: WorkEntryDTO[]): RankedEntry[] {
  return entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry),
    }))
    .sort((a, b) => b.score - a.score)
}

function scoreEntry(entry: WorkEntryDTO): number {
  let score = 0

  if (entry.importance > 0) score += entry.importance * 2

  if (entry.entryType === 'achievement') score += 10
  else if (entry.entryType === 'task') score += 3
  else if (entry.entryType === 'meeting') score += 2

  if (entry.aiStatus === 'completed') score += 5
  if (entry.aiSummary) score += 2

  if (entry.projectId) score += 1

  return score
}

export function groupByProject(
  entries: WorkEntryDTO[],
  projectNames: Map<string, string>,
): Map<string, WorkEntryDTO[]> {
  const groups = new Map<string, WorkEntryDTO[]>()

  for (const entry of entries) {
    const key = entry.projectId
      ? projectNames.get(entry.projectId) || 'Unassigned'
      : 'Unassigned'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }

  return groups
}

export function buildEvidenceFromEntries(
  ranked: RankedEntry[],
  maxEvidence = 10,
): ReportEvidence[] {
  return ranked.slice(0, maxEvidence).map((re) => ({
    entryId: re.entry.id,
    relevance: re.score,
    entryContent: re.entry.content,
    entryOccurredAt: re.entry.occurredAt,
  }))
}

export function filterEntriesForReport(
  entries: WorkEntryDTO[],
  dateFrom: string,
  dateTo: string,
): WorkEntryDTO[] {
  return entries.filter(
    (e) => !e.deletedAt && e.occurredAt >= dateFrom && e.occurredAt <= dateTo,
  )
}
