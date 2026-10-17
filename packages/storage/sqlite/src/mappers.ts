import type {
  WorkEntryDTO,
  ProjectDTO,
  TagDTO,
  AchievementDTO,
  ReportDTO,
} from '@appraiseme/contracts'

interface SqliteEntryRow {
  id: string
  owner_id: string
  project_id: string | null
  content: string
  content_plain: string | null
  entry_type: string
  status: string
  importance: number
  source: string
  occurred_at: string
  ai_status: string
  ai_summary: string | null
  ai_metadata: string
  version: number
  device_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapEntryRow(row: SqliteEntryRow): WorkEntryDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    content: row.content,
    contentPlain: row.content_plain,
    entryType: row.entry_type,
    status: row.status,
    importance: row.importance,
    source: row.source,
    occurredAt: row.occurred_at,
    aiStatus: row.ai_status,
    aiSummary: row.ai_summary,
    aiMetadata: JSON.parse(row.ai_metadata || '{}'),
    version: row.version,
    deviceId: row.device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

interface SqliteProjectRow {
  id: string
  owner_id: string
  name: string
  description: string | null
  status: string
  started_at: string | null
  ended_at: string | null
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapProjectRow(row: SqliteProjectRow): ProjectDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

interface SqliteTagRow {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export function mapTagRow(row: SqliteTagRow): TagDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: row.created_at,
  }
}

interface SqliteAchievementRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  impact: string | null
  importance: number
  status: string
  started_at: string | null
  completed_at: string | null
  source: string
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapAchievementRow(row: SqliteAchievementRow): AchievementDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    impact: row.impact,
    importance: row.importance,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    source: row.source,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

interface SqliteReportRow {
  id: string
  owner_id: string
  title: string
  report_type: string
  date_from: string
  date_to: string
  style: string
  status: string
  content_markdown: string | null
  content_json: string | null
  ai_provider: string | null
  ai_model: string | null
  prompt_version: string | null
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapReportRow(row: SqliteReportRow): ReportDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    reportType: row.report_type,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    style: row.style,
    status: row.status,
    contentMarkdown: row.content_markdown,
    contentJson: row.content_json ? JSON.parse(row.content_json) : null,
    aiProvider: row.ai_provider,
    aiModel: row.ai_model,
    promptVersion: row.prompt_version,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}
