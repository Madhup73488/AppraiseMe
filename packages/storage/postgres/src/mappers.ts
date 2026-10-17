import type {
  WorkEntryDTO,
  ProjectDTO,
  TagDTO,
  AchievementDTO,
  ReportDTO,
} from '@appraiseme/contracts'

type Row = Record<string, unknown>

export function mapEntryRow(row: Row): WorkEntryDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    projectId: row.project_id ? String(row.project_id) : null,
    content: String(row.content),
    contentPlain: row.content_plain ? String(row.content_plain) : null,
    entryType: String(row.entry_type),
    status: String(row.status),
    importance: Number(row.importance),
    source: String(row.source),
    occurredAt: String(row.occurred_at),
    aiStatus: String(row.ai_status),
    aiSummary: row.ai_summary ? String(row.ai_summary) : null,
    aiMetadata: (row.ai_metadata as Record<string, unknown>) || {},
    version: Number(row.version),
    deviceId: row.device_id ? String(row.device_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

export function mapProjectRow(row: Row): ProjectDTO {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    status: String(row.status),
    startedAt: row.started_at ? String(row.started_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
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
    description: row.description ? String(row.description) : null,
    impact: row.impact ? String(row.impact) : null,
    importance: Number(row.importance),
    status: String(row.status),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    source: String(row.source),
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
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
    contentMarkdown: row.content_markdown ? String(row.content_markdown) : null,
    contentJson: (row.content_json as Record<string, unknown>) || null,
    aiProvider: row.ai_provider ? String(row.ai_provider) : null,
    aiModel: row.ai_model ? String(row.ai_model) : null,
    promptVersion: row.prompt_version ? String(row.prompt_version) : null,
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}
