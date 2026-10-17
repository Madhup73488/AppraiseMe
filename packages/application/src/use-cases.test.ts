import { describe, it, expect } from 'vitest'
import type {
  WorklogStore,
  WorkEntryDTO,
  CreateEntryInput,
  UpdateEntryInput,
  AIProvider,
  ProjectDTO,
  ReportDTO,
  StructuredGenerationRequest,
  ProviderHealth,
  ControlPlaneClient,
} from '@appraiseme/contracts'
import type { OutboxStore, OutboxEvent } from '@appraiseme/sync'
import {
  createCaptureEntryUseCase,
  createListTimelineUseCase,
  createUpdateEntryUseCase,
  createDeleteEntryUseCase,
  createListProjectsUseCase,
  createCreateProjectUseCase,
  createSearchEntriesUseCase,
  createListTagsUseCase,
  createCreateTagUseCase,
  createListReportsUseCase,
  createGenerateReportUseCase,
  createTestAIConnectionUseCase,
  createEnrichEntryUseCase,
  createAskWorklogUseCase,
  createBackfillToRemoteUseCase,
} from './index.js'

function makeStore(): WorklogStore & {
  entryData: Map<string, WorkEntryDTO>
  projectData: Map<string, ProjectDTO>
  reportData: Map<string, ReportDTO>
} {
  const entryData = new Map<string, WorkEntryDTO>()
  const projectData = new Map<string, ProjectDTO>()
  const reportData = new Map<string, ReportDTO>()
  let entryCounter = 0
  let projectCounter = 0
  let reportCounter = 0
  let tagCounter = 0
  const tagData = new Map()

  const store: WorklogStore = {
    entries: {
      async create(input: CreateEntryInput) {
        const id = `entry-${++entryCounter}`
        const now = new Date().toISOString()
        const entry: WorkEntryDTO = {
          id,
          ownerId: 'owner',
          projectId: input.projectId || null,
          content: input.content,
          contentPlain: null,
          entryType: input.entryType || 'other',
          status: 'active',
          importance: 0,
          source: 'manual',
          occurredAt: input.occurredAt || now,
          aiStatus: 'pending',
          aiSummary: null,
          aiMetadata: {},
          version: 1,
          deviceId: input.deviceId || null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }
        entryData.set(id, entry)
        return entry
      },
      async update(id: string, input: UpdateEntryInput) {
        const existing = entryData.get(id)
        if (!existing) throw new Error(`Entry ${id} not found`)
        const updated: WorkEntryDTO = {
          ...existing,
          content: input.content ?? existing.content,
          entryType: input.entryType ?? existing.entryType,
          importance: input.importance ?? existing.importance,
          status: input.status ?? existing.status,
          aiStatus: input.aiStatus ?? existing.aiStatus,
          aiSummary:
            input.aiSummary !== undefined ? input.aiSummary : existing.aiSummary,
          aiMetadata: input.aiMetadata ?? existing.aiMetadata,
          version: existing.version + 1,
          updatedAt: new Date().toISOString(),
        }
        entryData.set(id, updated)
        return updated
      },
      async delete(id: string) {
        entryData.delete(id)
      },
      async getById(id: string) {
        return entryData.get(id) || null
      },
      async upsert(entry) {
        const full: WorkEntryDTO = { ...entry, ownerId: 'owner', deletedAt: null }
        entryData.set(entry.id, full)
        return full
      },
      async list(input) {
        let items = Array.from(entryData.values())
        if (input.dateRange) {
          items = items.filter(
            (e) =>
              e.occurredAt >= input.dateRange!.from &&
              e.occurredAt <= input.dateRange!.to,
          )
        }
        if (input.projectId) {
          items = items.filter((e) => e.projectId === input.projectId)
        }
        if (input.entryType) {
          items = items.filter((e) => e.entryType === input.entryType)
        }
        items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        if (input.limit) items = items.slice(0, input.limit)
        return items
      },
    },
    projects: {
      async create(input) {
        const id = `project-${++projectCounter}`
        const now = new Date().toISOString()
        const project: ProjectDTO = {
          id,
          ownerId: 'owner',
          name: input.name,
          description: input.description || null,
          status: 'active',
          startedAt: null,
          endedAt: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }
        projectData.set(id, project)
        return project
      },
      async update() {
        throw new Error('not needed')
      },
      async delete(id) {
        projectData.delete(id)
      },
      async list() {
        return Array.from(projectData.values())
      },
    },
    tags: {
      async list() {
        return Array.from(tagData.values())
      },
      async create(name) {
        const tag = {
          id: `tag-${++tagCounter}`,
          ownerId: 'owner',
          name,
          createdAt: new Date().toISOString(),
        }
        tagData.set(tag.id, tag)
        return tag
      },
    },
    achievements: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not needed')
      },
    },
    reports: {
      async create(input) {
        const id = `report-${++reportCounter}`
        const now = new Date().toISOString()
        const report: ReportDTO = {
          id,
          ownerId: 'owner',
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
        }
        reportData.set(id, report)
        return report
      },
      async getById(id) {
        return reportData.get(id) || null
      },
      async list() {
        return Array.from(reportData.values())
      },
    },
    search: {
      async search(query) {
        return Array.from(entryData.values()).filter((e) =>
          e.content.toLowerCase().includes(query.toLowerCase()),
        )
      },
    },
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>) {
      return fn(store)
    },
    async getSchemaVersion() {
      return 1
    },
  }

  return Object.assign(store, { entryData, projectData, reportData })
}

class RecordingOutbox implements OutboxStore {
  events: OutboxEvent[] = []
  private counter = 0

  async enqueue(
    event: Omit<
      OutboxEvent,
      | 'id'
      | 'state'
      | 'attempts'
      | 'lastError'
      | 'nextRetryAt'
      | 'createdAt'
      | 'processedAt'
    >,
  ): Promise<string> {
    const id = `evt-${++this.counter}`
    this.events.push({
      ...event,
      id,
      state: 'pending',
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      processedAt: null,
    })
    return id
  }
  async getPending() {
    return []
  }
  async markProcessing() {}
  async markSucceeded() {}
  async markFailed() {}
  async markDeadLetter() {}
  async getById() {
    return null
  }
  async countPending() {
    return this.events.length
  }
}

function makeControlPlane(verifyResult?: Promise<{ status: string }>) {
  return {
    aiConnections: {
      verify: (_id: string) =>
        verifyResult ?? Promise.resolve({ status: 'verified' }),
    },
  } as unknown as ControlPlaneClient
}

describe('ai connection use cases', () => {
  it('tests an ai connection via the control plane', async () => {
    const controlPlane = makeControlPlane()
    const testConnection = createTestAIConnectionUseCase({ controlPlane })
    const result = await testConnection('conn-1')
    expect(result.status).toBe('verified')
  })

  it('wraps failures in AIProviderError', async () => {
    const controlPlane = makeControlPlane(
      Promise.reject(new Error('invalid key')),
    )
    const testConnection = createTestAIConnectionUseCase({ controlPlane })

    await expect(testConnection('conn-1')).rejects.toThrow('invalid key')
  })
})

describe('enrich entry use case', () => {
  function makeProvider(
    result: Record<string, unknown> | Error,
  ): AIProvider {
    return {
      async generate(req) {
        if (result instanceof Error) throw result
        return req.parse(result)
      },
      async testConnection() {
        return { healthy: true }
      },
    }
  }

  it('persists enrichment results and enqueues an outbox event', async () => {
    const store = makeStore()
    const outbox = new RecordingOutbox()
    const created = await store.entries.create({
      content: 'Shipped the payments service',
    })

    const enrich = createEnrichEntryUseCase({
      store,
      provider: makeProvider({
        entryType: 'achievement',
        summary: 'Shipped payments service',
        suggestedProject: 'payments',
        suggestedTags: ['backend', 'release'],
        qualitativeImpact: null,
        achievementAssociation: null,
        confidence: 0.9,
      }),
      providerName: 'openai',
      modelName: 'gpt-4o',
      outbox,
    })

    const output = await enrich(created.id)
    expect(output.skipped).toBe(false)

    const updated = await store.entries.getById(created.id)
    expect(updated!.aiStatus).toBe('completed')
    expect(updated!.aiSummary).toBe('Shipped payments service')
    expect(updated!.entryType).toBe('achievement')
    expect(updated!.aiMetadata?.suggested_tags).toEqual(['backend', 'release'])
    expect(updated!.aiMetadata?.provider).toBe('openai')
    expect(updated!.aiMetadata?.content_hash).toBeDefined()

    expect(outbox.events).toHaveLength(1)
    expect(outbox.events[0]!.operation).toBe('update')
    const payload = JSON.parse(outbox.events[0]!.payload) as {
      entry: WorkEntryDTO
    }
    expect(payload.entry.aiStatus).toBe('completed')
  })

  it('marks the entry failed when enrichment errors', async () => {
    const store = makeStore()
    const created = await store.entries.create({ content: 'Broken entry' })

    const enrich = createEnrichEntryUseCase({
      store,
      provider: makeProvider(new Error('bad api key')),
      providerName: 'openai',
      modelName: 'gpt-4o',
      maxRetries: 1,
    })

    await expect(enrich(created.id)).rejects.toThrow('bad api key')

    const updated = await store.entries.getById(created.id)
    expect(updated!.aiStatus).toBe('failed')
    expect(updated!.aiMetadata?.last_error).toBe('bad api key')
  })

  it('skips enrichment when content is unchanged', async () => {
    const store = makeStore()
    const created = await store.entries.create({ content: 'Same content' })
    const { contentHash } = await import('@appraiseme/ai-core')
    const hash = await contentHash('Same content')
    await store.entries.update(created.id, {
      aiStatus: 'completed',
      aiSummary: 'Existing summary',
      aiMetadata: { content_hash: hash },
    })

    const enrich = createEnrichEntryUseCase({
      store,
      provider: makeProvider({
        entryType: 'task',
        summary: 'should not be used',
        suggestedTags: [],
        confidence: 1,
      }),
      providerName: 'openai',
      modelName: 'gpt-4o',
    })

    const output = await enrich(created.id)
    expect(output.skipped).toBe(true)

    const updated = await store.entries.getById(created.id)
    expect(updated!.aiSummary).toBe('Existing summary')
  })
})

describe('capture entry use case', () => {
  it('creates an entry', async () => {
    const store = makeStore()
    const capture = createCaptureEntryUseCase({ store })

    const entry = await capture({ content: 'Wrote tests' })
    expect(entry.id).toBeDefined()
    expect(entry.content).toBe('Wrote tests')
    expect(await store.entries.getById(entry.id)).not.toBeNull()
  })

  it('enqueues an outbox event when provided', async () => {
    const store = makeStore()
    const outbox = new RecordingOutbox()
    const capture = createCaptureEntryUseCase({ store, outbox })

    await capture({ content: 'Synced entry' })

    expect(outbox.events).toHaveLength(1)
    expect(outbox.events[0]!.operation).toBe('create')
    expect(outbox.events[0]!.entityType).toBe('work_entry')
    const payload = JSON.parse(outbox.events[0]!.payload) as {
      entry: WorkEntryDTO
    }
    expect(payload.entry.content).toBe('Synced entry')
  })
})

describe('list timeline use case', () => {
  it('lists entries ordered by occurredAt desc', async () => {
    const store = makeStore()
    await store.entries.create({
      content: 'older',
      occurredAt: '2024-01-01T00:00:00.000Z',
    })
    await store.entries.create({
      content: 'newer',
      occurredAt: '2024-03-01T00:00:00.000Z',
    })

    const list = createListTimelineUseCase({ store })
    const entries = await list({})
    expect(entries.map((e) => e.content)).toEqual(['newer', 'older'])
  })
})

describe('update entry use case', () => {
  it('updates content and bumps version', async () => {
    const store = makeStore()
    const created = await store.entries.create({ content: 'before' })

    const update = createUpdateEntryUseCase({ store })
    const updated = await update(created.id, {
      content: 'after',
      importance: 3,
    })

    expect(updated.content).toBe('after')
    expect(updated.importance).toBe(3)
    expect(updated.version).toBe(2)
  })

  it('enqueues an update outbox event when provided', async () => {
    const store = makeStore()
    const outbox = new RecordingOutbox()
    const created = await store.entries.create({ content: 'before' })

    const update = createUpdateEntryUseCase({ store, outbox })
    await update(created.id, { content: 'after' })

    expect(outbox.events).toHaveLength(1)
    expect(outbox.events[0]!.operation).toBe('update')
  })
})

describe('delete entry use case', () => {
  it('deletes the entry', async () => {
    const store = makeStore()
    const created = await store.entries.create({ content: 'temp' })

    const remove = createDeleteEntryUseCase({ store })
    await remove(created.id)

    expect(await store.entries.getById(created.id)).toBeNull()
  })

  it('enqueues a delete outbox event when provided', async () => {
    const store = makeStore()
    const outbox = new RecordingOutbox()
    const created = await store.entries.create({ content: 'temp' })

    const remove = createDeleteEntryUseCase({ store, outbox })
    await remove(created.id)

    expect(outbox.events).toHaveLength(1)
    expect(outbox.events[0]!.operation).toBe('delete')
  })
})

describe('projects and tags use cases', () => {
  it('creates and lists projects', async () => {
    const store = makeStore()
    const createProject = createCreateProjectUseCase({ store })
    const listProjects = createListProjectsUseCase({ store })

    const project = await createProject({ name: 'Apollo' })
    expect(project.name).toBe('Apollo')

    const list = await listProjects()
    expect(list.map((p) => p.name)).toEqual(['Apollo'])
  })

  it('creates tags', async () => {
    const store = makeStore()
    const createTag = createCreateTagUseCase({ store })
    const listTags = createListTagsUseCase({ store })

    const tag = await createTag('urgent')
    expect(tag.name).toBe('urgent')
    expect((await listTags()).map((t) => t.name)).toEqual(['urgent'])
  })
})

describe('search entries use case', () => {
  it('delegates to the store search repository', async () => {
    const store = makeStore()
    await store.entries.create({ content: 'React refactoring' })
    await store.entries.create({ content: 'Python scripts' })

    const search = createSearchEntriesUseCase({ store })
    const results = await search('react')
    expect(results.map((e) => e.content)).toEqual(['React refactoring'])
  })

  it('filters by AI-suggested taxonomy tag', async () => {
    const store = makeStore()
    const debugged = await store.entries.create({
      content: 'Fixed payment retry bug',
    })
    await store.entries.update(debugged.id, {
      content: 'Fixed payment retry bug',
      aiMetadata: { suggested_tags: ['debugging', 'issue-fix'] },
    })
    await store.entries.create({ content: 'Wrote payment retry docs' })

    const search = createSearchEntriesUseCase({ store })

    const debugging = await search('payment', { tag: 'debugging' })
    expect(debugging.map((e) => e.content)).toEqual([
      'Fixed payment retry bug',
    ])

    const feature = await search('payment', { tag: 'feature' })
    expect(feature).toEqual([])

    const unfiltered = await search('payment')
    expect(unfiltered).toHaveLength(2)
  })
})

describe('reports use cases', () => {
  it('lists reports', async () => {
    const store = makeStore()
    await store.reports.create({
      title: 'Weekly',
      reportType: 'weekly',
      dateFrom: '2024-06-01T00:00:00.000Z',
      dateTo: '2024-06-07T00:00:00.000Z',
    })

    const listReports = createListReportsUseCase({ store })
    const reports = await listReports()
    expect(reports.map((r) => r.title)).toEqual(['Weekly'])
  })

  it('generates a report from entries and persists it', async () => {
    const store = makeStore()
    await store.entries.create({
      content: 'Shipped feature X',
      occurredAt: '2024-06-02T00:00:00.000Z',
    })
    await store.entries.create({
      content: 'Old entry outside range',
      occurredAt: '2023-01-02T00:00:00.000Z',
    })

    const prompts: string[] = []
    const provider: AIProvider = {
      async generate<T>(request: StructuredGenerationRequest<T>): Promise<T> {
        prompts.push(request.userPrompt)
        return request.parse({
          title: 'Generated Report',
          summary: 'Did great work.',
          sections: [
            {
              key: 'achievements',
              title: 'Achievements',
              claims: [
                {
                  id: 'claim-1',
                  claimText: 'Shipped feature X',
                  sortOrder: 0,
                  evidence: [{ entryId: 'entry-1', relevance: 1 }],
                },
              ],
            },
          ],
        })
      },
      async testConnection(): Promise<ProviderHealth> {
        return { healthy: true, latencyMs: 5 }
      },
    }

    const generate = createGenerateReportUseCase({
      store,
      provider,
      providerName: 'openai',
      modelName: 'gpt-4o-mini',
    })

    const { reportId, output } = await generate({
      reportType: 'monthly',
      dateFrom: '2024-06-01T00:00:00.000Z',
      dateTo: '2024-06-30T23:59:59.999Z',
    })

    expect(reportId).toBeDefined()
    expect(output.report.title).toBe('Generated Report')
    expect(output.provider).toBe('openai')
    expect(output.model).toBe('gpt-4o-mini')
    expect(output.promptVersion).toBe('1')

    const persisted = await store.reports.getById(reportId)
    expect(persisted).not.toBeNull()
    expect(persisted!.reportType).toBe('monthly')

    expect(prompts).toHaveLength(1)
    expect(prompts[0]!).toContain('Shipped feature X')
    expect(prompts[0]!).not.toContain('Old entry outside range')
  })
  it('answers questions about the work log using entries as context', async () => {
    const store = makeStore()
    await store.entries.create({ content: 'Fixed the login bug' })
    await store.entries.create({ content: 'Shipped the payments API' })

    const prompts: string[] = []
    const provider: AIProvider = {
      async generate<T>(request: StructuredGenerationRequest<T>): Promise<T> {
        prompts.push(request.userPrompt)
        return request.parse({ answer: 'You shipped the payments API.' })
      },
      async testConnection(): Promise<ProviderHealth> {
        return { healthy: true, latencyMs: 5 }
      },
    }

    const ask = createAskWorklogUseCase({ store, provider })
    const result = await ask('What did I ship?')

    expect(result.entryCount).toBe(2)
    expect(result.answer).toBe('You shipped the payments API.')
    expect(prompts[0]).toContain('Fixed the login bug')
    expect(prompts[0]).toContain('Shipped the payments API')
    expect(prompts[0]).toContain('What did I ship?')
  })

  it('answers without calling the provider when no entries exist', async () => {
    const store = makeStore()
    let calls = 0
    const provider: AIProvider = {
      async generate<T>(request: StructuredGenerationRequest<T>): Promise<T> {
        calls++
        return request.parse({ answer: 'unused' })
      },
      async testConnection(): Promise<ProviderHealth> {
        return { healthy: true, latencyMs: 5 }
      },
    }

    const ask = createAskWorklogUseCase({ store, provider })
    const result = await ask('Anything?')

    expect(calls).toBe(0)
    expect(result.entryCount).toBe(0)
    expect(result.answer).toContain('no work entries')
  })
})

describe('backfill to remote use case', () => {
  it('copies entries, remaps projects by name, and is idempotent', async () => {
    const local = makeStore()
    const remote = makeStore()

    const project = await local.projects.create({ name: 'Alpha' })
    await local.tags.create('urgent')
    await local.entries.create({
      content: 'Shipped the thing',
      projectId: project.id,
    })

    const remoteProject = await remote.projects.create({ name: 'Alpha' })

    const backfill = createBackfillToRemoteUseCase({ localStore: local })
    const first = await backfill(remote)

    expect(first.projects).toBe(0) // matched by name
    expect(first.tags).toBe(1)
    expect(first.entries).toBe(1)

    const remoteEntries = await remote.entries.list({ limit: 100 })
    expect(remoteEntries).toHaveLength(1)
    expect(remoteEntries[0]!.projectId).toBe(remoteProject.id)
    expect(remoteEntries[0]!.content).toBe('Shipped the thing')

    const remoteTags = await remote.tags.list()
    expect(remoteTags.map((t) => t.name)).toContain('urgent')

    const second = await backfill(remote)
    expect(second.projects).toBe(0)
    expect(second.tags).toBe(0)
    expect(second.entries).toBe(1) // upserted again, still one row
    const afterSecond = await remote.entries.list({ limit: 100 })
    expect(afterSecond).toHaveLength(1)
  })
})
