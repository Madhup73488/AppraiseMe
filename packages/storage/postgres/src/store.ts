import pg from 'pg'
import type { PoolClient } from 'pg'
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
import { SCHEMA_VERSION, postgresMigration } from './schema.js'
import {
  mapEntryRow,
  mapProjectRow,
  mapTagRow,
  mapAchievementRow,
  mapReportRow,
} from './mappers.js'

export interface CreatePostgresStoreOptions {
  connectionString: string
  ownerId: string
  maxConnections?: number
}

export interface PostgresStoreHandle {
  store: WorklogStore
  close(): Promise<void>
}

export function createPostgresStore(
  opts: CreatePostgresStoreOptions,
): PostgresStoreHandle {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.maxConnections || 10,
  })

  const ownerId = opts.ownerId
  let migrated = false

  async function ensureMigration(): Promise<void> {
    if (migrated) return
    const client = await pool.connect()
    try {
      await client.query(postgresMigration)
      const result = await client.query(
        'SELECT value FROM worklog_meta WHERE key = $1',
        ['schema_version'],
      )
      const currentVersion = result.rows.length
        ? parseInt(result.rows[0].value, 10)
        : 0
      if (currentVersion > SCHEMA_VERSION) {
        throw new SchemaVersionError(
          `Database schema version ${currentVersion} is newer than adapter version ${SCHEMA_VERSION}`,
          { current: currentVersion, expected: SCHEMA_VERSION },
        )
      }
      migrated = true
    } finally {
      client.release()
    }
  }

  const entries: EntryRepository = {
    async create(input: CreateEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      const occurredAt = input.occurredAt || now

      await pool.query(
        `INSERT INTO work_entries (
          id, owner_id, project_id, content, content_plain, entry_type,
          status, importance, source, occurred_at, ai_status, ai_metadata,
          version, device_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 0, 'manual', $7, 'pending', '{}', 1, $8, $9, $10)`,
        [
          id,
          ownerId,
          input.projectId || null,
          input.content,
          null,
          input.entryType || 'other',
          occurredAt,
          input.deviceId || null,
          now,
          now,
        ],
      )

      return (await this.getById(id))!
    },

    async update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const sets: string[] = []
      const params: unknown[] = []
      let paramIdx = 1

      if (input.content !== undefined) {
        sets.push(`content = $${paramIdx++}`)
        params.push(input.content)
      }
      if (input.projectId !== undefined) {
        sets.push(`project_id = $${paramIdx++}`)
        params.push(input.projectId)
      }
      if (input.entryType !== undefined) {
        sets.push(`entry_type = $${paramIdx++}`)
        params.push(input.entryType)
      }
      if (input.importance !== undefined) {
        sets.push(`importance = $${paramIdx++}`)
        params.push(input.importance)
      }
      if (input.status !== undefined) {
        sets.push(`status = $${paramIdx++}`)
        params.push(input.status)
      }
      if (input.aiStatus !== undefined) {
        sets.push(`ai_status = $${paramIdx++}`)
        params.push(input.aiStatus)
      }
      if (input.aiSummary !== undefined) {
        sets.push(`ai_summary = $${paramIdx++}`)
        params.push(input.aiSummary)
      }
      if (input.aiMetadata !== undefined) {
        sets.push(`ai_metadata = $${paramIdx++}`)
        params.push(JSON.stringify(input.aiMetadata))
      }

      sets.push(`version = version + 1`)
      sets.push(`updated_at = $${paramIdx++}`)
      params.push(now)
      params.push(id)
      params.push(ownerId)

      await pool.query(
        `UPDATE work_entries SET ${sets.join(', ')}
         WHERE id = $${paramIdx++} AND owner_id = $${paramIdx++} AND deleted_at IS NULL`,
        params,
      )

      return (await this.getById(id))!
    },

    async delete(id: string): Promise<void> {
      await ensureMigration()
      const now = new Date().toISOString()
      await pool.query(
        `UPDATE work_entries SET deleted_at = $1, updated_at = $2
         WHERE id = $3 AND owner_id = $4`,
        [now, now, id, ownerId],
      )
    },

    async upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO> {
      await ensureMigration()
      await pool.query(
        `INSERT INTO work_entries (
           id, owner_id, project_id, content, content_plain, entry_type,
           status, importance, source, occurred_at, ai_status, ai_summary,
           ai_metadata, version, device_id, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
         )
         ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id,
           content = EXCLUDED.content,
           content_plain = EXCLUDED.content_plain,
           entry_type = EXCLUDED.entry_type,
           status = EXCLUDED.status,
           importance = EXCLUDED.importance,
           source = EXCLUDED.source,
           occurred_at = EXCLUDED.occurred_at,
           ai_status = EXCLUDED.ai_status,
           ai_summary = EXCLUDED.ai_summary,
           ai_metadata = EXCLUDED.ai_metadata,
           version = EXCLUDED.version,
           device_id = EXCLUDED.device_id,
           updated_at = EXCLUDED.updated_at,
           deleted_at = NULL`,
        [
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
        ],
      )

      return (await this.getById(entry.id))!
    },

    async getById(id: string): Promise<WorkEntryDTO | null> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM work_entries WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [id, ownerId],
      )
      return result.rows.length ? mapEntryRow(result.rows[0]) : null
    },

    async list(input: ListEntriesInput): Promise<WorkEntryDTO[]> {
      await ensureMigration()
      const conditions = ['owner_id = $1', 'deleted_at IS NULL']
      const params: unknown[] = [ownerId]
      let paramIdx = 2

      if (input.dateRange) {
        conditions.push(`occurred_at >= $${paramIdx++}`)
        conditions.push(`occurred_at <= $${paramIdx++}`)
        params.push(input.dateRange.from, input.dateRange.to)
      }
      if (input.projectId) {
        conditions.push(`project_id = $${paramIdx++}`)
        params.push(input.projectId)
      }
      if (input.entryType) {
        conditions.push(`entry_type = $${paramIdx++}`)
        params.push(input.entryType)
      }

      const limit = input.limit || 50
      params.push(limit)

      const result = await pool.query(
        `SELECT * FROM work_entries WHERE ${conditions.join(' AND ')}
         ORDER BY occurred_at DESC LIMIT $${paramIdx}`,
        params,
      )
      return result.rows.map(mapEntryRow)
    },
  }

  const projects: ProjectRepository = {
    async create(input: CreateProjectInput): Promise<ProjectDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await pool.query(
        `INSERT INTO projects (id, owner_id, name, description, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', 1, $5, $6)`,
        [id, ownerId, input.name, input.description || null, now, now],
      )
      const result = await pool.query('SELECT * FROM projects WHERE id = $1', [
        id,
      ])
      return mapProjectRow(result.rows[0])
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const sets: string[] = []
      const params: unknown[] = []
      let paramIdx = 1

      if (input.name !== undefined) {
        sets.push(`name = $${paramIdx++}`)
        params.push(input.name)
      }
      if (input.description !== undefined) {
        sets.push(`description = $${paramIdx++}`)
        params.push(input.description)
      }
      if (input.status !== undefined) {
        sets.push(`status = $${paramIdx++}`)
        params.push(input.status)
      }

      sets.push(`version = version + 1`)
      sets.push(`updated_at = $${paramIdx++}`)
      params.push(now)
      params.push(id)
      params.push(ownerId)

      await pool.query(
        `UPDATE projects SET ${sets.join(', ')}
         WHERE id = $${paramIdx++} AND owner_id = $${paramIdx++}`,
        params,
      )
      const result = await pool.query('SELECT * FROM projects WHERE id = $1', [
        id,
      ])
      return mapProjectRow(result.rows[0])
    },

    async delete(id: string): Promise<void> {
      await ensureMigration()
      const now = new Date().toISOString()
      await pool.query(
        `UPDATE projects SET deleted_at = $1, updated_at = $2
         WHERE id = $3 AND owner_id = $4`,
        [now, now, id, ownerId],
      )
    },

    async list(): Promise<ProjectDTO[]> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM projects WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY name`,
        [ownerId],
      )
      return result.rows.map(mapProjectRow)
    },
  }

  const tags: TagRepository = {
    async list(): Promise<TagDTO[]> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM tags WHERE owner_id = $1 ORDER BY name`,
        [ownerId],
      )
      return result.rows.map(mapTagRow)
    },

    async create(name: string): Promise<TagDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await pool.query(
        `INSERT INTO tags (id, owner_id, name, created_at) VALUES ($1, $2, $3, $4)`,
        [id, ownerId, name, now],
      )
      return { id, ownerId, name, createdAt: now }
    },
  }

  const achievements: AchievementRepository = {
    async list(): Promise<AchievementDTO[]> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM achievements WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [ownerId],
      )
      return result.rows.map(mapAchievementRow)
    },

    async create(input: CreateAchievementInput): Promise<AchievementDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await pool.query(
        `INSERT INTO achievements (id, owner_id, title, description, impact, importance, status, source, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, 'active', 'user', 1, $6, $7)`,
        [
          id,
          ownerId,
          input.title,
          input.description || null,
          input.impact || null,
          now,
          now,
        ],
      )
      const result = await pool.query(
        'SELECT * FROM achievements WHERE id = $1',
        [id],
      )
      return mapAchievementRow(result.rows[0])
    },
  }

  const reports: ReportRepository = {
    async create(input: CreateReportInput): Promise<ReportDTO> {
      await ensureMigration()
      const now = new Date().toISOString()
      const id = randomUUID()
      await pool.query(
        `INSERT INTO reports (id, owner_id, title, report_type, date_from, date_to, style, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 1, $8, $9)`,
        [
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
      )
      return (await this.getById(id))!
    },

    async getById(id: string): Promise<ReportDTO | null> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM reports WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [id, ownerId],
      )
      return result.rows.length ? mapReportRow(result.rows[0]) : null
    },

    async list(): Promise<ReportDTO[]> {
      await ensureMigration()
      const result = await pool.query(
        `SELECT * FROM reports WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [ownerId],
      )
      return result.rows.map(mapReportRow)
    },
  }

  const search: SearchRepository = {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      await ensureMigration()
      const conditions = [
        'owner_id = $1',
        'deleted_at IS NULL',
        '(content ILIKE $2 OR content_plain ILIKE $2 OR ai_summary ILIKE $2)',
      ]
      const pattern = `%${query}%`
      const params: unknown[] = [ownerId, pattern]
      let paramIdx = 3

      if (filters?.dateRange) {
        conditions.push(`occurred_at >= $${paramIdx++}`)
        conditions.push(`occurred_at <= $${paramIdx++}`)
        params.push(filters.dateRange.from, filters.dateRange.to)
      }
      if (filters?.projectId) {
        conditions.push(`project_id = $${paramIdx++}`)
        params.push(filters.projectId)
      }
      if (filters?.entryType) {
        conditions.push(`entry_type = $${paramIdx++}`)
        params.push(filters.entryType)
      }

      const result = await pool.query(
        `SELECT * FROM work_entries WHERE ${conditions.join(' AND ')}
         ORDER BY occurred_at DESC LIMIT 100`,
        params,
      )
      return result.rows.map(mapEntryRow)
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
      const result = await pool.query(
        `SELECT value FROM worklog_meta WHERE key = $1`,
        ['schema_version'],
      )
      return result.rows.length ? parseInt(result.rows[0].value, 10) : 0
    },

    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      await ensureMigration()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const txStore = createTxStore(client, ownerId)
        const result = await fn(txStore)
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
  }

  return {
    store,
    close: () => pool.end(),
  }
}

function createTxStore(client: PoolClient, ownerId: string): WorklogStore {
  const entries: EntryRepository = {
    async create(input: CreateEntryInput) {
      const now = new Date().toISOString()
      const id = randomUUID()
      const occurredAt = input.occurredAt || now
      await client.query(
        `INSERT INTO work_entries (id, owner_id, project_id, content, entry_type, occurred_at, device_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          ownerId,
          input.projectId || null,
          input.content,
          input.entryType || 'other',
          occurredAt,
          input.deviceId || null,
          now,
          now,
        ],
      )
      const result = await client.query(
        'SELECT * FROM work_entries WHERE id = $1',
        [id],
      )
      return mapEntryRow(result.rows[0])
    },
    async update(id: string, input: UpdateEntryInput) {
      const now = new Date().toISOString()
      const sets: string[] = []
      const params: unknown[] = []
      let idx = 1
      if (input.content !== undefined) {
        sets.push(`content = $${idx++}`)
        params.push(input.content)
      }
      if (input.projectId !== undefined) {
        sets.push(`project_id = $${idx++}`)
        params.push(input.projectId)
      }
      if (input.entryType !== undefined) {
        sets.push(`entry_type = $${idx++}`)
        params.push(input.entryType)
      }
      if (input.importance !== undefined) {
        sets.push(`importance = $${idx++}`)
        params.push(input.importance)
      }
      if (input.status !== undefined) {
        sets.push(`status = $${idx++}`)
        params.push(input.status)
      }
      if (input.aiStatus !== undefined) {
        sets.push(`ai_status = $${idx++}`)
        params.push(input.aiStatus)
      }
      if (input.aiSummary !== undefined) {
        sets.push(`ai_summary = $${idx++}`)
        params.push(input.aiSummary)
      }
      if (input.aiMetadata !== undefined) {
        sets.push(`ai_metadata = $${idx++}`)
        params.push(JSON.stringify(input.aiMetadata))
      }
      sets.push(`version = version + 1`, `updated_at = $${idx++}`)
      params.push(now, id, ownerId)
      await client.query(
        `UPDATE work_entries SET ${sets.join(', ')} WHERE id = $${idx++} AND owner_id = $${idx++}`,
        params,
      )
      const result = await client.query(
        'SELECT * FROM work_entries WHERE id = $1',
        [id],
      )
      return mapEntryRow(result.rows[0])
    },
    async delete(id: string) {
      const now = new Date().toISOString()
      await client.query(
        'UPDATE work_entries SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND owner_id = $4',
        [now, now, id, ownerId],
      )
    },
    async upsert(entry: UpsertEntryInput) {
      await client.query(
        `INSERT INTO work_entries (
           id, owner_id, project_id, content, content_plain, entry_type,
           status, importance, source, occurred_at, ai_status, ai_summary,
           ai_metadata, version, device_id, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
         )
         ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id,
           content = EXCLUDED.content,
           content_plain = EXCLUDED.content_plain,
           entry_type = EXCLUDED.entry_type,
           status = EXCLUDED.status,
           importance = EXCLUDED.importance,
           source = EXCLUDED.source,
           occurred_at = EXCLUDED.occurred_at,
           ai_status = EXCLUDED.ai_status,
           ai_summary = EXCLUDED.ai_summary,
           ai_metadata = EXCLUDED.ai_metadata,
           version = EXCLUDED.version,
           device_id = EXCLUDED.device_id,
           updated_at = EXCLUDED.updated_at,
           deleted_at = NULL`,
        [
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
        ],
      )
      const result = await client.query(
        'SELECT * FROM work_entries WHERE id = $1',
        [entry.id],
      )
      return mapEntryRow(result.rows[0])
    },
    async getById(id: string) {
      const result = await client.query(
        'SELECT * FROM work_entries WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [id, ownerId],
      )
      return result.rows.length ? mapEntryRow(result.rows[0]) : null
    },
    async list(input: ListEntriesInput) {
      const conditions = ['owner_id = $1', 'deleted_at IS NULL']
      const params: unknown[] = [ownerId]
      let idx = 2
      if (input.dateRange) {
        conditions.push(`occurred_at >= $${idx++}`, `occurred_at <= $${idx++}`)
        params.push(input.dateRange.from, input.dateRange.to)
      }
      if (input.projectId) {
        conditions.push(`project_id = $${idx++}`)
        params.push(input.projectId)
      }
      if (input.entryType) {
        conditions.push(`entry_type = $${idx++}`)
        params.push(input.entryType)
      }
      params.push(input.limit || 50)
      const result = await client.query(
        `SELECT * FROM work_entries WHERE ${conditions.join(' AND ')} ORDER BY occurred_at DESC LIMIT $${idx}`,
        params,
      )
      return result.rows.map(mapEntryRow)
    },
  }

  return {
    entries,
    projects: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented in tx')
      },
      async update() {
        throw new Error('not implemented in tx')
      },
      async delete() {},
    },
    tags: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented in tx')
      },
    },
    achievements: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented in tx')
      },
    },
    reports: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented in tx')
      },
      async getById() {
        return null
      },
    },
    search: {
      async search() {
        return []
      },
    },
    async getSchemaVersion() {
      return SCHEMA_VERSION
    },
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      return fn(this)
    },
  }
}
