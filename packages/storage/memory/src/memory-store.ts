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

export interface StoreSnapshot {
  version: 1
  entries: Array<WorkEntryDTO & { deleted: boolean }>
  projects: Array<ProjectDTO & { deleted: boolean }>
  tags: TagDTO[]
  achievements: Array<AchievementDTO & { deleted: boolean }>
  reports: Array<ReportDTO & { deleted: boolean }>
}

export type MemoryStore = WorklogStore & {
  snapshot(): StoreSnapshot
  hydrate(snapshot: StoreSnapshot): void
}

export function createMemoryStore(ownerId: string): MemoryStore {
  const entries = new Map<string, WorkEntryDTO & { deleted: boolean }>()
  const projects = new Map<string, ProjectDTO & { deleted: boolean }>()
  const tags = new Map<string, TagDTO>()
  const achievements = new Map<string, AchievementDTO & { deleted: boolean }>()
  const reports = new Map<string, ReportDTO & { deleted: boolean }>()

  const entryRepo: EntryRepository = {
    async create(input: CreateEntryInput): Promise<WorkEntryDTO> {
      const now = new Date().toISOString()
      const entry: WorkEntryDTO & { deleted: boolean } = {
        id: randomUUID(),
        ownerId,
        projectId: input.projectId || null,
        content: input.content,
        contentPlain: null,
        entryType: input.entryType || 'other',
        status: 'active',
        importance: 0,
        source: input.source || 'manual',
        occurredAt: input.occurredAt || now,
        aiStatus: 'pending',
        aiSummary: null,
        aiMetadata: {},
        version: 1,
        deviceId: input.deviceId || null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deleted: false,
      }
      entries.set(entry.id, entry)
      const { deleted: _deleted, ...dto } = entry
      return dto
    },

    async update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> {
      const existing = entries.get(id)
      if (!existing || existing.deleted)
        throw new Error(`Entry ${id} not found`)
      const now = new Date().toISOString()
      const updated: WorkEntryDTO & { deleted: boolean } = {
        ...existing,
        content: input.content ?? existing.content,
        projectId: input.projectId ?? existing.projectId,
        entryType: input.entryType ?? existing.entryType,
        importance: input.importance ?? existing.importance,
        status: input.status ?? existing.status,
        aiStatus: input.aiStatus ?? existing.aiStatus,
        aiSummary: input.aiSummary !== undefined ? input.aiSummary : existing.aiSummary,
        aiMetadata: input.aiMetadata ?? existing.aiMetadata,
        version: existing.version + 1,
        updatedAt: now,
      }
      entries.set(id, updated)
      const { deleted: _deleted, ...dto } = updated
      return dto
    },

    async delete(id: string): Promise<void> {
      const existing = entries.get(id)
      if (!existing) return
      const now = new Date().toISOString()
      entries.set(id, {
        ...existing,
        deletedAt: now,
        updatedAt: now,
        deleted: true,
      })
    },

    async upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO> {
      const full: WorkEntryDTO & { deleted: boolean } = {
        ...entry,
        ownerId,
        deletedAt: null,
        deleted: false,
      }
      entries.set(entry.id, full)
      const { deleted: _deleted, ...dto } = full
      return dto
    },

    async getById(id: string): Promise<WorkEntryDTO | null> {
      const entry = entries.get(id)
      if (!entry || entry.deleted) return null
      const { deleted: _deleted, ...dto } = entry
      return dto
    },

    async list(input: ListEntriesInput): Promise<WorkEntryDTO[]> {
      let result = Array.from(entries.values()).filter((e) => !e.deleted)

      if (input.dateRange) {
        result = result.filter(
          (e) =>
            e.occurredAt >= input.dateRange!.from &&
            e.occurredAt <= input.dateRange!.to,
        )
      }
      if (input.projectId) {
        result = result.filter((e) => e.projectId === input.projectId)
      }
      if (input.entryType) {
        result = result.filter((e) => e.entryType === input.entryType)
      }

      result.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

      const limit = input.limit || 50
      return result.slice(0, limit).map(({ deleted: _d, ...dto }) => dto)
    },
  }

  const projectRepo: ProjectRepository = {
    async create(input: CreateProjectInput): Promise<ProjectDTO> {
      const now = new Date().toISOString()
      const project: ProjectDTO & { deleted: boolean } = {
        id: randomUUID(),
        ownerId,
        name: input.name,
        description: input.description || null,
        status: 'active',
        startedAt: null,
        endedAt: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deleted: false,
      }
      projects.set(project.id, project)
      const { deleted: _deleted, ...dto } = project
      return dto
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectDTO> {
      const existing = projects.get(id)
      if (!existing || existing.deleted)
        throw new Error(`Project ${id} not found`)
      const now = new Date().toISOString()
      const updated = {
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        status: input.status ?? existing.status,
        version: existing.version + 1,
        updatedAt: now,
      }
      projects.set(id, updated)
      const { deleted: _deleted, ...dto } = updated
      return dto
    },

    async delete(id: string): Promise<void> {
      const existing = projects.get(id)
      if (!existing) return
      const now = new Date().toISOString()
      projects.set(id, {
        ...existing,
        deletedAt: now,
        updatedAt: now,
        deleted: true,
      })
    },

    async list(): Promise<ProjectDTO[]> {
      return Array.from(projects.values())
        .filter((p) => !p.deleted)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ deleted: _d, ...dto }) => dto)
    },
  }

  const tagRepo: TagRepository = {
    async list(): Promise<TagDTO[]> {
      return Array.from(tags.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      )
    },
    async create(name: string): Promise<TagDTO> {
      const tag: TagDTO = {
        id: randomUUID(),
        ownerId,
        name,
        createdAt: new Date().toISOString(),
      }
      tags.set(tag.id, tag)
      return tag
    },
  }

  const achievementRepo: AchievementRepository = {
    async list(): Promise<AchievementDTO[]> {
      return Array.from(achievements.values())
        .filter((a) => !a.deleted)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ deleted: _d, ...dto }) => dto)
    },
    async create(input: CreateAchievementInput): Promise<AchievementDTO> {
      const now = new Date().toISOString()
      const achievement: AchievementDTO & { deleted: boolean } = {
        id: randomUUID(),
        ownerId,
        title: input.title,
        description: input.description || null,
        impact: input.impact || null,
        importance: 0,
        status: 'active',
        startedAt: null,
        completedAt: null,
        source: 'user',
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deleted: false,
      }
      achievements.set(achievement.id, achievement)
      const { deleted: _deleted, ...dto } = achievement
      return dto
    },
  }

  const reportRepo: ReportRepository = {
    async create(input: CreateReportInput): Promise<ReportDTO> {
      const now = new Date().toISOString()
      const report: ReportDTO & { deleted: boolean } = {
        id: randomUUID(),
        ownerId,
        title: input.title,
        reportType: input.reportType,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        style: input.style || 'balanced',
        status: 'draft',
        contentMarkdown: null,
        contentJson: null,
        aiProvider: null,
        aiModel: null,
        promptVersion: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deleted: false,
      }
      reports.set(report.id, report)
      const { deleted: _deleted, ...dto } = report
      return dto
    },
    async getById(id: string): Promise<ReportDTO | null> {
      const report = reports.get(id)
      if (!report || report.deleted) return null
      const { deleted: _deleted, ...dto } = report
      return dto
    },
    async list(): Promise<ReportDTO[]> {
      return Array.from(reports.values())
        .filter((r) => !r.deleted)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ deleted: _d, ...dto }) => dto)
    },
  }

  const searchRepo: SearchRepository = {
    async search(
      query: string,
      filters?: SearchFilters,
    ): Promise<WorkEntryDTO[]> {
      const q = query.toLowerCase()
      let result = Array.from(entries.values()).filter(
        (e) =>
          !e.deleted &&
          (e.content.toLowerCase().includes(q) ||
            (e.aiSummary?.toLowerCase().includes(q) ?? false)),
      )

      if (filters?.dateRange) {
        result = result.filter(
          (e) =>
            e.occurredAt >= filters.dateRange!.from &&
            e.occurredAt <= filters.dateRange!.to,
        )
      }
      if (filters?.projectId) {
        result = result.filter((e) => e.projectId === filters.projectId)
      }
      if (filters?.entryType) {
        result = result.filter((e) => e.entryType === filters.entryType)
      }

      return result
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 100)
        .map(({ deleted: _d, ...dto }) => dto)
    },
  }

  const store: MemoryStore = {
    entries: entryRepo,
    projects: projectRepo,
    tags: tagRepo,
    achievements: achievementRepo,
    reports: reportRepo,
    search: searchRepo,
    async getSchemaVersion() {
      return 1
    },
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      return fn(store)
    },
    snapshot(): StoreSnapshot {
      return {
        version: 1,
        entries: Array.from(entries.values()),
        projects: Array.from(projects.values()),
        tags: Array.from(tags.values()),
        achievements: Array.from(achievements.values()),
        reports: Array.from(reports.values()),
      }
    },
    hydrate(snapshot: StoreSnapshot) {
      entries.clear()
      projects.clear()
      tags.clear()
      achievements.clear()
      reports.clear()
      for (const entry of snapshot.entries) entries.set(entry.id, entry)
      for (const project of snapshot.projects) projects.set(project.id, project)
      for (const tag of snapshot.tags) tags.set(tag.id, tag)
      for (const achievement of snapshot.achievements)
        achievements.set(achievement.id, achievement)
      for (const report of snapshot.reports) reports.set(report.id, report)
    },
  }

  return store
}
