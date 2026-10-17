import type { DateRange } from '@appraiseme/domain'

export interface EntryRepository {
  create(input: CreateEntryInput): Promise<WorkEntryDTO>
  update(id: string, input: UpdateEntryInput): Promise<WorkEntryDTO>
  delete(id: string): Promise<void>
  getById(id: string): Promise<WorkEntryDTO | null>
  list(input: ListEntriesInput): Promise<WorkEntryDTO[]>
  upsert(entry: UpsertEntryInput): Promise<WorkEntryDTO>
}

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectDTO>
  update(id: string, input: UpdateProjectInput): Promise<ProjectDTO>
  delete(id: string): Promise<void>
  list(): Promise<ProjectDTO[]>
}

export interface TagRepository {
  list(): Promise<TagDTO[]>
  create(name: string): Promise<TagDTO>
}

export interface AchievementRepository {
  list(): Promise<AchievementDTO[]>
  create(input: CreateAchievementInput): Promise<AchievementDTO>
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<ReportDTO>
  getById(id: string): Promise<ReportDTO | null>
  list(): Promise<ReportDTO[]>
}

export interface SearchRepository {
  search(query: string, filters?: SearchFilters): Promise<WorkEntryDTO[]>
}

export interface WorklogStore {
  entries: EntryRepository
  projects: ProjectRepository
  tags: TagRepository
  achievements: AchievementRepository
  reports: ReportRepository
  search: SearchRepository
  transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T>
  getSchemaVersion(): Promise<number>
}

export interface WorkEntryDTO {
  id: string
  ownerId: string
  projectId: string | null
  content: string
  contentPlain: string | null
  entryType: string
  status: string
  importance: number
  source: string
  occurredAt: string
  aiStatus: string
  aiSummary: string | null
  aiMetadata: Record<string, unknown>
  version: number
  deviceId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateEntryInput {
  content: string
  projectId?: string
  entryType?: string
  occurredAt?: string
  deviceId?: string
  /** Capture origin: 'manual' (default) | 'voice' */
  source?: string
}

export interface UpdateEntryInput {
  content?: string
  projectId?: string
  entryType?: string
  importance?: number
  status?: string
  aiStatus?: string
  aiSummary?: string | null
  aiMetadata?: Record<string, unknown>
}

export type UpsertEntryInput = Omit<WorkEntryDTO, 'ownerId' | 'deletedAt'>

export interface ListEntriesInput {
  dateRange?: DateRange
  projectId?: string
  entryType?: string
  cursor?: string
  limit?: number
}

export interface ProjectDTO {
  id: string
  ownerId: string
  name: string
  description: string | null
  status: string
  startedAt: string | null
  endedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: string
}

export interface TagDTO {
  id: string
  ownerId: string
  name: string
  createdAt: string
}

export interface AchievementDTO {
  id: string
  ownerId: string
  title: string
  description: string | null
  impact: string | null
  importance: number
  status: string
  startedAt: string | null
  completedAt: string | null
  source: string
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateAchievementInput {
  title: string
  description?: string
  impact?: string
}

export interface ReportDTO {
  id: string
  ownerId: string
  title: string
  reportType: string
  dateFrom: string
  dateTo: string
  style: string
  status: string
  contentMarkdown: string | null
  contentJson: Record<string, unknown> | null
  aiProvider: string | null
  aiModel: string | null
  promptVersion: string | null
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateReportInput {
  title: string
  reportType: string
  dateFrom: string
  dateTo: string
  style?: string
}

export interface SearchFilters {
  dateRange?: DateRange
  projectId?: string
  entryType?: string
  /** Filter by AI-suggested taxonomy tag (e.g. "debugging") */
  tag?: string
  /** Max results (search use case widens this when tag filter is active) */
  limit?: number
}
