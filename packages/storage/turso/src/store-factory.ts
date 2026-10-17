import type { Client } from '@libsql/client'
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
import { SCHEMA_VERSION, tursoMigration } from './schema.js'
import {
  mapEntryRow,
  mapProjectRow,
  mapTagRow,
  mapAchievementRow,
  mapReportRow,
} from './mappers.js'

export interface TursoStoreHandle {
  store: WorklogStore
  close(): Promise<void>
}

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function createTursoStoreFromClient(
  client: Client,
  ownerId: string,
): TursoStoreHandle {
  let migrated = false

  async function ensureMigration(): Promise<void> {
    if (migrated) return
    await client.executeMultiple(tursoMigration)
    const result = await client.execute({
      sql: 'SELECT value FROM worklog_meta WHERE key = ?',
      args: ['schema_version'],
    })
    const currentVersion = result.rows.length
      ? parseInt(String(result.rows[0]!.value), 10)
      : 0
    if (currentVersion > SCHEMA_VERSION) {
      throw new SchemaVersionError(
        `Database schema version ${currentVersion} is newer than adapter version ${SCHEMA_VERSION}`,
        { current: currentVersion, expected: SCHEMA_VERSION },
      )
    }
    migrated = true
  }

  const entries: EntryRepository = {
    async create(input: CreateEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      const occurredAt = input.occurredAt || now

      await client.execute({
        sql: `INSERT INTO work_entries (
          id, owner_id, project_id, content, content_plain, entry_type,
          status, importance, source, occurred_at, ai_status, ai_metadata,
          version, device_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'active', 0, ?, ?, 'pending', '{}', 1, ?, ?, ?)`,
        args: [
          id,
          ownerId,
          input.projectId || null,
          input.content,
          input.entryType || 'other',
          input.source || 'manual',
          occurredAt,
          input.deviceId || null,
          now,
          now,
        ],
      })

      return (await this.getById(id))!
    },

    async update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const sets: string[] = []
      const args: unknown[] = []

      if (input.content !== undefined) {
        sets.push('content = ?')
        args.push(input.content)
      }
      if (input.projectId !== undefined) {
        sets.push('project_id = ?')
        args.push(input.projectId)
      }
      if (input.entryType !== undefined) {
        sets.push('entry_type = ?')
        args.push(input.entryType)
      }
      if (input.importance !== undefined) {
        sets.push('importance = ?')
        args.push(input.importance)
      }
      if (input.status !== undefined) {
        sets.push('status = ?')
        args.push(input.status)
      }
      if (input.aiStatus !== undefined) {
        sets.push('ai_status = ?')
        args.push(input.aiStatus)
      }
      if (input.aiSummary !== undefined) {
        sets.push('ai_summary = ?')
        args.push(input.aiSummary)
      }
      if (input.aiMetadata !== undefined) {
        sets.push('ai_metadata = ?')
        args.push(JSON.stringify(input.aiMetadata))
      }

      sets.push('version = version + 1')
      sets.push('updated_at = ?')
      args.push(now, id, ownerId)

      await client.execute({
        sql: `UPDATE work_entries SET ${sets.join(', ')} WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
        args: args as never[],
      })

      return (await this.getById(id))!
    },

    async delete(id: string): Promise<void> {
      await ensureMigration()
      const now = new Date().toISOString()
      await client.execute({
        sql: 'UPDATE work_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
        args: [now, now, id, ownerId],
      })
    },

    async upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      await client.execute({
        sql: `INSERT INTO work_entries (
          id, owner_id, project_id, content, content_plain, entry_type,
          status, importance, source, occurred_at, ai_status, ai_summary,
          ai_metadata, version, device_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          deleted_at = NULL`,
        args: [
          entry.id,
          ownerId,
          entry.projectId,
          entry.content,
          entry.contentPlain,
          entry.entryType,
          entry.status,
          entry.importance,
          entry.source,
          entry.occurredAt,
          entry.aiStatus,
          entry.aiSummary,
          JSON.stringify(entry.aiMetadata ?? {}),
          entry.version,
          entry.deviceId,
          entry.createdAt,
          entry.updatedAt,
        ] as never[],
      })

      return (await this.getById(entry.id))!
    },

    async getById(id: string): Promise<WorkEntryDTO | null> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM work_entries WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
        args: [id, ownerId],
      })
      return result.rows.length
        ? mapEntryRow(result.rows[0] as Record<string, unknown>)
        : null
    },

    async list(input: ListEntriesInput): Promise<WorkEntryDTO[]> {
      await ensureMigration()
      const conditions = ['owner_id = ?', 'deleted_at IS NULL']
      const args: unknown[] = [ownerId]

      if (input.dateRange) {
        conditions.push('occurred_at >= ?', 'occurred_at <= ?')
        args.push(input.dateRange.from, input.dateRange.to)
      }
      if (input.projectId) {
        conditions.push('project_id = ?')
        args.push(input.projectId)
      }
      if (input.entryType) {
        conditions.push('entry_type = ?')
        args.push(input.entryType)
      }

      const limit = input.limit || 50
      args.push(limit)

      const result = await client.execute({
        sql: `SELECT * FROM work_entries WHERE ${conditions.join(' AND ')} ORDER BY occurred_at DESC LIMIT ?`,
        args: args as never[],
      })
      return result.rows.map((row) =>
        mapEntryRow(row as Record<string, unknown>),
      )
    },
  }

  const projects: ProjectRepository = {
    async create(input: CreateProjectInput): Promise<ProjectDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await client.execute({
        sql: `INSERT INTO projects (id, owner_id, name, description, status, version, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'active', 1, ?, ?)`,
        args: [id, ownerId, input.name, input.description || null, now, now],
      })
      const result = await client.execute({
        sql: 'SELECT * FROM projects WHERE id = ?',
        args: [id],
      })
      return mapProjectRow(result.rows[0] as Record<string, unknown>)
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const sets: string[] = []
      const args: unknown[] = []

      if (input.name !== undefined) {
        sets.push('name = ?')
        args.push(input.name)
      }
      if (input.description !== undefined) {
        sets.push('description = ?')
        args.push(input.description)
      }
      if (input.status !== undefined) {
        sets.push('status = ?')
        args.push(input.status)
      }

      sets.push('version = version + 1', 'updated_at = ?')
      args.push(now, id, ownerId)

      await client.execute({
        sql: `UPDATE projects SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`,
        args: args as never[],
      })
      const result = await client.execute({
        sql: 'SELECT * FROM projects WHERE id = ?',
        args: [id],
      })
      return mapProjectRow(result.rows[0] as Record<string, unknown>)
    },

    async delete(id: string): Promise<void> {
      await ensureMigration()
      const now = new Date().toISOString()
      await client.execute({
        sql: 'UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
        args: [now, now, id, ownerId],
      })
    },

    async list(): Promise<ProjectDTO[]> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM projects WHERE owner_id = ? AND deleted_at IS NULL ORDER BY name',
        args: [ownerId],
      })
      return result.rows.map((row) =>
        mapProjectRow(row as Record<string, unknown>),
      )
    },
  }

  const tags: TagRepository = {
    async list(): Promise<TagDTO[]> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM tags WHERE owner_id = ? ORDER BY name',
        args: [ownerId],
      })
      return result.rows.map((row) => mapTagRow(row as Record<string, unknown>))
    },

    async create(name: string): Promise<TagDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await client.execute({
        sql: 'INSERT INTO tags (id, owner_id, name, created_at) VALUES (?, ?, ?, ?)',
        args: [id, ownerId, name, now],
      })
      return { id, ownerId, name, createdAt: now }
    },
  }

  const achievements: AchievementRepository = {
    async list(): Promise<AchievementDTO[]> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM achievements WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        args: [ownerId],
      })
      return result.rows.map((row) =>
        mapAchievementRow(row as Record<string, unknown>),
      )
    },

    async create(input: CreateAchievementInput): Promise<AchievementDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await client.execute({
        sql: `INSERT INTO achievements (id, owner_id, title, description, impact, importance, status, source, version, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 0, 'active', 'user', 1, ?, ?)`,
        args: [
          id,
          ownerId,
          input.title,
          input.description || null,
          input.impact || null,
          now,
          now,
        ],
      })
      const result = await client.execute({
        sql: 'SELECT * FROM achievements WHERE id = ?',
        args: [id],
      })
      return mapAchievementRow(result.rows[0] as Record<string, unknown>)
    },
  }

  const reports: ReportRepository = {
    async create(input: CreateReportInput): Promise<ReportDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await client.execute({
        sql: `INSERT INTO reports (id, owner_id, title, report_type, date_from, date_to, style, status, version, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`,
        args: [
          id,
          ownerId,
          input.title,
          input.reportType,
          input.dateFrom,
          input.dateTo,
          input.style || 'balanced',
          now,
          now,
        ],
      })
      return (await this.getById(id))!
    },

    async getById(id: string): Promise<ReportDTO | null> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM reports WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
        args: [id, ownerId],
      })
      return result.rows.length
        ? mapReportRow(result.rows[0] as Record<string, unknown>)
        : null
    },

    async list(): Promise<ReportDTO[]> {
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT * FROM reports WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        args: [ownerId],
      })
      return result.rows.map((row) =>
        mapReportRow(row as Record<string, unknown>),
      )
    },
  }

  const search: SearchRepository = {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      await ensureMigration()
      const conditions = [
        'owner_id = ?',
        'deleted_at IS NULL',
        '(content LIKE ? OR content_plain LIKE ? OR ai_summary LIKE ?)',
      ]
      const pattern = `%${query}%`
      const args: unknown[] = [ownerId, pattern, pattern, pattern]

      if (filters?.dateRange) {
        conditions.push('occurred_at >= ?', 'occurred_at <= ?')
        args.push(filters.dateRange.from, filters.dateRange.to)
      }
      if (filters?.projectId) {
        conditions.push('project_id = ?')
        args.push(filters.projectId)
      }
      if (filters?.entryType) {
        conditions.push('entry_type = ?')
        args.push(filters.entryType)
      }

      const result = await client.execute({
        sql: `SELECT * FROM work_entries WHERE ${conditions.join(' AND ')} ORDER BY occurred_at DESC LIMIT 100`,
        args: args as never[],
      })
      return result.rows.map((row) =>
        mapEntryRow(row as Record<string, unknown>),
      )
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
      await ensureMigration()
      const result = await client.execute({
        sql: 'SELECT value FROM worklog_meta WHERE key = ?',
        args: ['schema_version'],
      })
      return result.rows.length
        ? parseInt(String(result.rows[0]!.value), 10)
        : 0
    },

    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      await ensureMigration()
      await client.execute('BEGIN')
      try {
        const result = await fn(store)
        await client.execute('COMMIT')
        return result
      } catch (err) {
        await client.execute('ROLLBACK')
        throw err
      }
    },
  }

  return {
    store,
    close: async () => {
      client.close()
    },
  }
}

export type { Client }
