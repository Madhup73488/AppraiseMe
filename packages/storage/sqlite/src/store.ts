import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type {
  WorklogStore,
  EntryRepository,
  ProjectRepository,
  TagRepository,
  AchievementRepository,
  ReportRepository,
  SearchRepository,
  WorkEntryDTO,
  CreateEntryInput,
  UpdateEntryInput,
  UpsertEntryInput,
  ListEntriesInput,
  ProjectDTO,
  CreateProjectInput,
  UpdateProjectInput,
  TagDTO,
  AchievementDTO,
  CreateAchievementInput,
  ReportDTO,
  CreateReportInput,
  SearchFilters,
} from '@appraiseme/contracts'
import { SchemaVersionError } from '@appraiseme/domain'
import { SCHEMA_VERSION, sqliteMigration } from './schema.js'
import {
  mapEntryRow,
  mapProjectRow,
  mapTagRow,
  mapAchievementRow,
  mapReportRow,
} from './mappers.js'

export interface CreateSqliteStoreOptions {
  dbPath: string
  ownerId: string
}

export interface SqliteStoreHandle {
  store: WorklogStore
  close(): void
}

export function createSqliteStore(
  opts: CreateSqliteStoreOptions,
): SqliteStoreHandle {
  const db = new Database(opts.dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(sqliteMigration)

  const storedVersion = db
    .prepare('SELECT value FROM worklog_meta WHERE key = ?')
    .get('schema_version') as { value: string } | undefined

  const currentVersion = storedVersion ? parseInt(storedVersion.value, 10) : 0
  if (currentVersion > SCHEMA_VERSION) {
    db.close()
    throw new SchemaVersionError(
      `Database schema version ${currentVersion} is newer than adapter version ${SCHEMA_VERSION}`,
      { current: currentVersion, expected: SCHEMA_VERSION },
    )
  }

  const ownerId = opts.ownerId

  const entries: EntryRepository = {
    async create(input: CreateEntryInput): Promise<WorkEntryDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()
      const occurredAt = input.occurredAt || now

      db.prepare(
        `
        INSERT INTO work_entries (
          id, owner_id, project_id, content, content_plain, entry_type,
          status, importance, source, occurred_at, ai_status, ai_metadata,
          version, device_id, created_at, updated_at
        ) VALUES (
          @id, @ownerId, @projectId, @content, @contentPlain, @entryType,
          'active', 0, 'manual', @occurredAt, 'pending', '{}',
          1, @deviceId, @now, @now
        )
      `,
      ).run({
        id,
        ownerId,
        projectId: input.projectId || null,
        content: input.content,
        contentPlain: null,
        entryType: input.entryType || 'other',
        occurredAt,
        deviceId: input.deviceId || null,
        now,
      })

      return (await this.getById(id))!
    },

    async update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> {
      const existing = db
        .prepare(
          'SELECT * FROM work_entries WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
        )
        .get(id, ownerId) as Record<string, unknown> | undefined

      if (!existing) throw new Error(`Entry ${id} not found`)

      const now = new Date().toISOString()
      const updates: string[] = []
      const params: Record<string, unknown> = { id, now, ownerId }

      if (input.content !== undefined) {
        updates.push('content = @content')
        params.content = input.content
      }
      if (input.projectId !== undefined) {
        updates.push('project_id = @projectId')
        params.projectId = input.projectId
      }
      if (input.entryType !== undefined) {
        updates.push('entry_type = @entryType')
        params.entryType = input.entryType
      }
      if (input.importance !== undefined) {
        updates.push('importance = @importance')
        params.importance = input.importance
      }
      if (input.status !== undefined) {
        updates.push('status = @status')
        params.status = input.status
      }
      if (input.aiStatus !== undefined) {
        updates.push('ai_status = @aiStatus')
        params.aiStatus = input.aiStatus
      }
      if (input.aiSummary !== undefined) {
        updates.push('ai_summary = @aiSummary')
        params.aiSummary = input.aiSummary
      }
      if (input.aiMetadata !== undefined) {
        updates.push('ai_metadata = @aiMetadata')
        params.aiMetadata = JSON.stringify(input.aiMetadata)
      }

      updates.push('version = version + 1')
      updates.push('updated_at = @now')

      db.prepare(
        `
        UPDATE work_entries SET ${updates.join(', ')}
        WHERE id = @id AND owner_id = @ownerId
      `,
      ).run(params)

      return (await this.getById(id))!
    },

    async delete(id: string): Promise<void> {
      const now = new Date().toISOString()
      db.prepare(
        `
        UPDATE work_entries SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?
      `,
      ).run(now, now, id, ownerId)
    },

    async upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO> {
      db.prepare(
        `
        INSERT INTO work_entries (
          id, owner_id, project_id, content, content_plain, entry_type,
          status, importance, source, occurred_at, ai_status, ai_summary,
          ai_metadata, version, device_id, created_at, updated_at
        ) VALUES (
          @id, @ownerId, @projectId, @content, @contentPlain, @entryType,
          @status, @importance, @source, @occurredAt, @aiStatus, @aiSummary,
          @aiMetadata, @version, @deviceId, @createdAt, @updatedAt
        )
        ON CONFLICT (id) DO UPDATE SET
          project_id = excluded.project_id,
          content = excluded.content,
          content_plain = excluded.content_plain,
          entry_type = excluded.entry_type,
          status = excluded.status,
          importance = excluded.importance,
          source = excluded.source,
          occurred_at = excluded.occurred_at,
          ai_status = excluded.ai_status,
          ai_summary = excluded.ai_summary,
          ai_metadata = excluded.ai_metadata,
          version = excluded.version,
          device_id = excluded.device_id,
          updated_at = excluded.updated_at,
          deleted_at = NULL
      `,
      ).run({
        id: entry.id,
        ownerId,
        projectId: entry.projectId,
        content: entry.content,
        contentPlain: entry.contentPlain,
        entryType: entry.entryType,
        status: entry.status,
        importance: entry.importance,
        source: entry.source,
        occurredAt: entry.occurredAt,
        aiStatus: entry.aiStatus,
        aiSummary: entry.aiSummary,
        aiMetadata: JSON.stringify(entry.aiMetadata ?? {}),
        version: entry.version,
        deviceId: entry.deviceId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })

      return (await this.getById(entry.id))!
    },

    async getById(id: string): Promise<WorkEntryDTO | null> {
      const row = db
        .prepare(
          'SELECT * FROM work_entries WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
        )
        .get(id, ownerId) as Record<string, unknown> | undefined
      return row ? mapEntryRow(row as never) : null
    },

    async list(input: ListEntriesInput): Promise<WorkEntryDTO[]> {
      const conditions = ['owner_id = ?', 'deleted_at IS NULL']
      const params: unknown[] = [ownerId]

      if (input.dateRange) {
        conditions.push('occurred_at >= ?')
        conditions.push('occurred_at <= ?')
        params.push(input.dateRange.from, input.dateRange.to)
      }
      if (input.projectId) {
        conditions.push('project_id = ?')
        params.push(input.projectId)
      }
      if (input.entryType) {
        conditions.push('entry_type = ?')
        params.push(input.entryType)
      }

      const limit = input.limit || 50
      params.push(limit)

      const rows = db
        .prepare(
          `
        SELECT * FROM work_entries
        WHERE ${conditions.join(' AND ')}
        ORDER BY occurred_at DESC
        LIMIT ?
      `,
        )
        .all(...params) as Record<string, unknown>[]

      return rows.map((row) => mapEntryRow(row as never))
    },
  }

  const projects: ProjectRepository = {
    async create(input: CreateProjectInput): Promise<ProjectDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()

      db.prepare(
        `
        INSERT INTO projects (id, owner_id, name, description, status, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', 1, ?, ?)
      `,
      ).run(id, ownerId, input.name, input.description || null, now, now)

      const row = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown>
      return mapProjectRow(row as never)
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      const now = new Date().toISOString()
      const updates: string[] = []
      const params: Record<string, unknown> = { id, now, ownerId }

      if (input.name !== undefined) {
        updates.push('name = @name')
        params.name = input.name
      }
      if (input.description !== undefined) {
        updates.push('description = @description')
        params.description = input.description
      }
      if (input.status !== undefined) {
        updates.push('status = @status')
        params.status = input.status
      }

      updates.push('version = version + 1')
      updates.push('updated_at = @now')

      db.prepare(
        `
        UPDATE projects SET ${updates.join(', ')}
        WHERE id = @id AND owner_id = @ownerId
      `,
      ).run(params)

      const row = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown>
      return mapProjectRow(row as never)
    },

    async delete(id: string): Promise<void> {
      const now = new Date().toISOString()
      db.prepare(
        `
        UPDATE projects SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?
      `,
      ).run(now, now, id, ownerId)
    },

    async list(): Promise<ProjectDTO[]> {
      const rows = db
        .prepare(
          'SELECT * FROM projects WHERE owner_id = ? AND deleted_at IS NULL ORDER BY name',
        )
        .all(ownerId) as Record<string, unknown>[]
      return rows.map((row) => mapProjectRow(row as never))
    },
  }

  const tags: TagRepository = {
    async list(): Promise<TagDTO[]> {
      const rows = db
        .prepare('SELECT * FROM tags WHERE owner_id = ? ORDER BY name')
        .all(ownerId) as Record<string, unknown>[]
      return rows.map((row) => mapTagRow(row as never))
    },

    async create(name: string): Promise<TagDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()
      db.prepare(
        `
        INSERT INTO tags (id, owner_id, name, created_at)
        VALUES (?, ?, ?, ?)
      `,
      ).run(id, ownerId, name, now)
      return { id, ownerId, name, createdAt: now }
    },
  }

  const achievements: AchievementRepository = {
    async list(): Promise<AchievementDTO[]> {
      const rows = db
        .prepare(
          'SELECT * FROM achievements WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        )
        .all(ownerId) as Record<string, unknown>[]
      return rows.map((row) => mapAchievementRow(row as never))
    },

    async create(input: CreateAchievementInput): Promise<AchievementDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()
      db.prepare(
        `
        INSERT INTO achievements (id, owner_id, title, description, impact, importance, status, source, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 'active', 'user', 1, ?, ?)
      `,
      ).run(
        id,
        ownerId,
        input.title,
        input.description || null,
        input.impact || null,
        now,
        now,
      )
      const row = db
        .prepare('SELECT * FROM achievements WHERE id = ?')
        .get(id) as Record<string, unknown>
      return mapAchievementRow(row as never)
    },
  }

  const reports: ReportRepository = {
    async create(input: CreateReportInput): Promise<ReportDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()
      db.prepare(
        `
        INSERT INTO reports (id, owner_id, title, report_type, date_from, date_to, style, status, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
      `,
      ).run(
        id,
        ownerId,
        input.title,
        input.reportType,
        input.dateFrom,
        input.dateTo,
        input.style || 'balanced',
        now,
        now,
      )
      return (await this.getById(id))!
    },

    async getById(id: string): Promise<ReportDTO | null> {
      const row = db
        .prepare(
          'SELECT * FROM reports WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
        )
        .get(id, ownerId) as Record<string, unknown> | undefined
      return row ? mapReportRow(row as never) : null
    },

    async list(): Promise<ReportDTO[]> {
      const rows = db
        .prepare(
          'SELECT * FROM reports WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        )
        .all(ownerId) as Record<string, unknown>[]
      return rows.map((row) => mapReportRow(row as never))
    },
  }

  const search: SearchRepository = {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      const conditions = [
        'owner_id = ?',
        'deleted_at IS NULL',
        '(content LIKE ? OR content_plain LIKE ? OR ai_summary LIKE ?)',
      ]
      const pattern = `%${query}%`
      const params: unknown[] = [ownerId, pattern, pattern, pattern]

      if (filters?.dateRange) {
        conditions.push('occurred_at >= ?')
        conditions.push('occurred_at <= ?')
        params.push(filters.dateRange.from, filters.dateRange.to)
      }
      if (filters?.projectId) {
        conditions.push('project_id = ?')
        params.push(filters.projectId)
      }
      if (filters?.entryType) {
        conditions.push('entry_type = ?')
        params.push(filters.entryType)
      }

      const rows = db
        .prepare(
          `
        SELECT * FROM work_entries
        WHERE ${conditions.join(' AND ')}
        ORDER BY occurred_at DESC
        LIMIT 100
      `,
        )
        .all(...params) as Record<string, unknown>[]

      return rows.map((row) => mapEntryRow(row as never))
    },
  }

  const store: WorklogStore = {
    entries,
    projects,
    tags,
    achievements,
    reports,
    search,

    async getSchemaVersion(): Promise<number> {
      const row = db
        .prepare('SELECT value FROM worklog_meta WHERE key = ?')
        .get('schema_version') as { value: string } | undefined
      return row ? parseInt(row.value, 10) : 0
    },

    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      db.exec('BEGIN')
      try {
        const result = await fn(store)
        db.exec('COMMIT')
        return result
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
  }

  return {
    store,
    close: () => db.close(),
  }
}
