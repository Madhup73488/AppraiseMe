import type {
  WorkEntryDTO,
  ProjectDTO,
  TagDTO,
  AchievementDTO,
  ReportDTO,
} from '@appraiseme/contracts'

type Row = Record<string, unknown>

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : v == null ? null : String(v)
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : parseInt(String(v ?? 0), 10) || 0
}

function json(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v))
    return v as Record<string, unknown>
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // fall through
    }
  }
  return {}
}

export function mapEntryRow(row: Row): WorkEntryDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    projectId: str(row.project_id),
    content: String(row.content),
    contentPlain: str(row.content_plain),
    entryType: String(row.entry_type),
    status: String(row.status),
    importance: num(row.importance),
    source: String(row.source),
    occurredAt: String(row.occurred_at),
    aiStatus: String(row.ai_status),
    aiSummary: str(row.ai_summary),
    aiMetadata: json(row.ai_metadata),
    version: num(row.version),
    deviceId: str(row.device_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: str(row.deleted_at),
  }
}

export function mapProjectRow(row: Row): ProjectDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    description: str(row.description),
    status: String(row.status),
    startedAt: str(row.started_at),
    endedAt: str(row.ended_at),
    version: num(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: str(row.deleted_at),
  }
}

export function mapTagRow(row: Row): TagDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    createdAt: String(row.created_at),
  }
}

export function mapAchievementRow(row: Row): AchievementDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title),
    description: str(row.description),
    impact: str(row.impact),
    importance: num(row.importance),
    status: String(row.status),
    startedAt: str(row.started_at),
    completedAt: str(row.completed_at),
    source: String(row.source),
    version: num(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: str(row.deleted_at),
  }
}

export function mapReportRow(row: Row): ReportDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title),
    reportType: String(row.report_type),
    dateFrom: String(row.date_from),
    dateTo: String(row.date_to),
    style: String(row.style),
    status: String(row.status),
    contentMarkdown: str(row.content_markdown),
    contentJson:
      row.content_json == null ? null : json(row.content_json),
    aiProvider: str(row.ai_provider),
    aiModel: str(row.ai_model),
    promptVersion: str(row.prompt_version),
    version: num(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: str(row.deleted_at),
  }
}
