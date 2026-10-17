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
import { ConnectionError } from '@appraiseme/domain'
import {
  mapEntryRow,
  mapProjectRow,
  mapTagRow,
  mapAchievementRow,
  mapReportRow,
} from './mappers.js'

export interface CreateSupabaseStoreOptions {
  /** e.g. https://your-project.supabase.co */
  url: string
  /** anon or service_role key for the user's own project */
  apiKey: string
  ownerId: string
}

export interface SupabaseStoreHandle {
  store: WorklogStore
  /** 404-safe health probe — false means the setup SQL has not been run */
  verifySetup(): Promise<{ ready: boolean; error?: string }>
  /** No persistent connections — resolves immediately */
  close(): Promise<void>
}

function toRow(url: string): string {
  const trimmed = url.replace(/\/+$/, '')
  // tolerate users pasting the full PostgREST root
  return trimmed.endsWith('/rest/v1') ? trimmed.slice(0, -'/rest/v1'.length) : trimmed
}

async function requestJson(
  base: string,
  apiKey: string,
  path: string,
  init?: RequestInit & { prefer?: string },
): Promise<unknown> {
  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (init?.prefer) headers.Prefer = init.prefer
  const res = await fetch(`${base}/rest/v1${path}`, { ...init, headers })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const body = (await res.json()) as {
        message?: string
        code?: string
        hint?: string
      }
      detail = `${res.status} ${body.message ?? ''}`.trim()
    } catch {
      // non-JSON error body
    }
    const missing =
      res.status === 404 &&
      /does not exist|not found|could not find the table/i.test(detail)
    throw new ConnectionError(
      missing
        ? 'Supabase worklog tables are missing — run the setup SQL first'
        : `Supabase request failed: ${detail}`,
      { adapter: 'supabase', status: res.status, missingSchema: missing },
    )
  }
  if (res.status === 204) return null
  return res.json() as Promise<unknown>
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

function firstRow(data: unknown): Record<string, unknown> {
  if (Array.isArray(data) && data.length > 0)
    return data[0] as Record<string, unknown>
  throw new ConnectionError('Supabase returned no rows', { adapter: 'supabase' })
}

export function createSupabaseStore(
  opts: CreateSupabaseStoreOptions,
): SupabaseStoreHandle {
  const base = toRow(opts.url)
  const key = opts.apiKey
  const ownerId = opts.ownerId

  const call = (
    path: string,
    init?: RequestInit & { prefer?: string },
  ): Promise<unknown> => requestJson(base, key, path, init)

  const close = async () => {}

  async function verifySetup(): Promise<{ ready: boolean; error?: string }> {
    try {
      await call('/worklog_meta?select=key&limit=1')
      return { ready: true }
    } catch (e) {
      return {
        ready: false,
        error: e instanceof Error ? e.message : 'Connection failed',
      }
    }
  }

  const entries: EntryRepository = {
    async create(input: CreateEntryInput): Promise<WorkEntryDTO> {
      const now = new Date().toISOString()
      const id = randomUUID()
      const data = await call('/work_entries', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id,
          owner_id: ownerId,
          project_id: input.projectId || null,
          content: input.content,
          entry_type: input.entryType || 'other',
          source: input.source || 'manual',
          occurred_at: input.occurredAt || now,
          device_id: input.deviceId || null,
          created_at: now,
          updated_at: now,
        }),
      })
      return mapEntryRow(firstRow(data))
    },

    async update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> {
      const current = await this.getById(id)
      if (!current) {
        throw new ConnectionError('Entry not found', { adapter: 'supabase' })
      }
      const patch: Record<string, unknown> = {}
      if (input.content !== undefined) patch.content = input.content
      if (input.projectId !== undefined) patch.project_id = input.projectId
      if (input.entryType !== undefined) patch.entry_type = input.entryType
      if (input.importance !== undefined) patch.importance = input.importance
      if (input.status !== undefined) patch.status = input.status
      if (input.aiStatus !== undefined) patch.ai_status = input.aiStatus
      if (input.aiSummary !== undefined) patch.ai_summary = input.aiSummary
      if (input.aiMetadata !== undefined) patch.ai_metadata = input.aiMetadata
      patch.version = current.version + 1
      patch.updated_at = new Date().toISOString()
      const data = await call(
        `/work_entries?id=eq.${id}&owner_id=eq.${ownerId}`,
        {
          method: 'PATCH',
          prefer: 'return=representation',
          body: JSON.stringify(patch),
        },
      )
      return mapEntryRow(firstRow(data))
    },

    async delete(id: string): Promise<void> {
      const now = new Date().toISOString()
      await call(`/work_entries?id=eq.${id}&owner_id=eq.${ownerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: now, updated_at: now }),
      })
    },

    async upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO> {
      const data = await call('/work_entries', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify({
          id: entry.id,
          owner_id: ownerId,
          project_id: entry.projectId,
          content: entry.content,
          content_plain: entry.contentPlain,
          entry_type: entry.entryType,
          status: entry.status,
          importance: entry.importance,
          source: entry.source,
          occurred_at: entry.occurredAt,
          ai_status: entry.aiStatus,
          ai_summary: entry.aiSummary,
          ai_metadata: entry.aiMetadata ?? {},
          version: entry.version,
          device_id: entry.deviceId,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt,
          deleted_at: null,
        }),
      })
      return mapEntryRow(firstRow(data))
    },

    async getById(id: string): Promise<WorkEntryDTO | null> {
      const data = (await call(
        `/work_entries?id=eq.${id}&owner_id=eq.${ownerId}&deleted_at=is.null&select=*`,
      )) as Array<Record<string, unknown>>
      return data.length > 0 ? mapEntryRow(data[0]!) : null
    },

    async list(input: ListEntriesInput): Promise<WorkEntryDTO[]> {
      const params = new URLSearchParams({
        owner_id: `eq.${ownerId}`,
        deleted_at: 'is.null',
        select: '*',
        order: 'occurred_at.desc',
        limit: String(input.limit || 50),
      })
      if (input.dateRange) {
        params.set('occurred_at', `gte.${input.dateRange.from}`)
        params.append('occurred_at', `lte.${input.dateRange.to}`)
      }
      if (input.projectId) params.set('project_id', `eq.${input.projectId}`)
      if (input.entryType) params.set('entry_type', `eq.${input.entryType}`)
      const data = (await call(
        `/work_entries?${params.toString()}`,
      )) as Array<Record<string, unknown>>
      return data.map(mapEntryRow)
    },
  }

  const projects: ProjectRepository = {
    async create(input: CreateProjectInput): Promise<ProjectDTO> {
      const now = new Date().toISOString()
      const data = await call('/projects', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: randomUUID(),
          owner_id: ownerId,
          name: input.name,
          description: input.description || null,
          created_at: now,
          updated_at: now,
        }),
      })
      return mapProjectRow(firstRow(data))
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      const currentRows = (await call(
        `/projects?id=eq.${id}&owner_id=eq.${ownerId}&select=*`,
      )) as Array<Record<string, unknown>>
      if (currentRows.length === 0) {
        throw new ConnectionError('Project not found', { adapter: 'supabase' })
      }
      const patch: Record<string, unknown> = {
        version: Number(currentRows[0]!.version) + 1,
        updated_at: new Date().toISOString(),
      }
      if (input.name !== undefined) patch.name = input.name
      if (input.description !== undefined) patch.description = input.description
      if (input.status !== undefined) patch.status = input.status
      const data = await call(
        `/projects?id=eq.${id}&owner_id=eq.${ownerId}`,
        {
          method: 'PATCH',
          prefer: 'return=representation',
          body: JSON.stringify(patch),
        },
      )
      return mapProjectRow(firstRow(data))
    },

    async delete(id: string): Promise<void> {
      const now = new Date().toISOString()
      await call(`/projects?id=eq.${id}&owner_id=eq.${ownerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: now, updated_at: now }),
      })
    },

    async list(): Promise<ProjectDTO[]> {
      const data = (await call(
        `/projects?owner_id=eq.${ownerId}&deleted_at=is.null&select=*&order=name.asc`,
      )) as Array<Record<string, unknown>>
      return data.map(mapProjectRow)
    },
  }

  const tags: TagRepository = {
    async list(): Promise<TagDTO[]> {
      const data = (await call(
        `/tags?owner_id=eq.${ownerId}&select=*&order=name.asc`,
      )) as Array<Record<string, unknown>>
      return data.map(mapTagRow)
    },

    async create(name: string): Promise<TagDTO> {
      const now = new Date().toISOString()
      const data = await call('/tags', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify({
          id: randomUUID(),
          owner_id: ownerId,
          name,
          created_at: now,
        }),
      })
      return mapTagRow(firstRow(data))
    },
  }

  const achievements: AchievementRepository = {
    async list(): Promise<AchievementDTO[]> {
      const data = (await call(
        `/achievements?owner_id=eq.${ownerId}&deleted_at=is.null&select=*&order=created_at.desc`,
      )) as Array<Record<string, unknown>>
      return data.map(mapAchievementRow)
    },

    async create(input: CreateAchievementInput): Promise<AchievementDTO> {
      const now = new Date().toISOString()
      const data = await call('/achievements', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: randomUUID(),
          owner_id: ownerId,
          title: input.title,
          description: input.description || null,
          impact: input.impact || null,
          created_at: now,
          updated_at: now,
        }),
      })
      return mapAchievementRow(firstRow(data))
    },
  }

  const reports: ReportRepository = {
    async create(input: CreateReportInput): Promise<ReportDTO> {
      const now = new Date().toISOString()
      const data = await call('/reports', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: randomUUID(),
          owner_id: ownerId,
          title: input.title,
          report_type: input.reportType,
          date_from: input.dateFrom,
          date_to: input.dateTo,
          style: input.style || 'balanced',
          created_at: now,
          updated_at: now,
        }),
      })
      return mapReportRow(firstRow(data))
    },

    async getById(id: string): Promise<ReportDTO | null> {
      const data = (await call(
        `/reports?id=eq.${id}&owner_id=eq.${ownerId}&deleted_at=is.null&select=*`,
      )) as Array<Record<string, unknown>>
      return data.length > 0 ? mapReportRow(data[0]!) : null
    },

    async list(): Promise<ReportDTO[]> {
      const data = (await call(
        `/reports?owner_id=eq.${ownerId}&deleted_at=is.null&select=*&order=created_at.desc`,
      )) as Array<Record<string, unknown>>
      return data.map(mapReportRow)
    },
  }

  const search: SearchRepository = {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      const pattern = `*${query.replace(/[,()]/g, ' ')}*`
      const params = new URLSearchParams({
        owner_id: `eq.${ownerId}`,
        deleted_at: 'is.null',
        select: '*',
        order: 'occurred_at.desc',
        limit: '100',
        or: `(content.ilike.${pattern},content_plain.ilike.${pattern},ai_summary.ilike.${pattern})`,
      })
      if (filters?.dateRange) {
        params.set('occurred_at', `gte.${filters.dateRange.from}`)
        params.append('occurred_at', `lte.${filters.dateRange.to}`)
      }
      if (filters?.projectId) {
        params.set('project_id', `eq.${filters.projectId}`)
      }
      if (filters?.entryType) {
        params.set('entry_type', `eq.${filters.entryType}`)
      }
      const data = (await call(
        `/work_entries?${params.toString()}`,
      )) as Array<Record<string, unknown>>
      return data.map(mapEntryRow)
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
      const data = (await call(
        `/worklog_meta?key=eq.schema_version&select=value`,
      )) as Array<{ value: string }>
      return data.length > 0 ? parseInt(data[0]!.value, 10) : 0
    },

    // PostgREST offers no client transactions — operations run sequentially
    // without atomicity. Documented limitation of the REST adapter.
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      return fn(store)
    },
  }

  return { store, verifySetup, close }
}
