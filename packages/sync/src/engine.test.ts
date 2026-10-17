import { describe, it, expect } from 'vitest'
import { createSyncEngine } from './engine.js'
import type { OutboxStore, OutboxEvent } from './types.js'
import type { WorklogStore, WorkEntryDTO } from '@appraiseme/contracts'

class FakeOutbox implements OutboxStore {
  events = new Map<string, OutboxEvent>()
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
    this.events.set(id, {
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

  async getPending(limit = 10): Promise<OutboxEvent[]> {
    return Array.from(this.events.values())
      .filter((e) => e.state === 'pending' || e.state === 'failed')
      .slice(0, limit)
  }

  async markProcessing(id: string): Promise<void> {
    const e = this.events.get(id)
    if (e) e.state = 'processing'
  }

  async markSucceeded(id: string): Promise<void> {
    const e = this.events.get(id)
    if (e) {
      e.state = 'succeeded'
      e.processedAt = new Date().toISOString()
    }
  }

  async markFailed(
    id: string,
    error: string,
    nextRetryAt: string,
  ): Promise<void> {
    const e = this.events.get(id)
    if (e) {
      e.state = 'failed'
      e.attempts += 1
      e.lastError = error
      e.nextRetryAt = nextRetryAt
    }
  }

  async markDeadLetter(id: string, error: string): Promise<void> {
    const e = this.events.get(id)
    if (e) {
      e.state = 'dead_letter'
      e.attempts += 1
      e.lastError = error
    }
  }

  async getById(id: string): Promise<OutboxEvent | null> {
    return this.events.get(id) || null
  }

  async countPending(): Promise<number> {
    return this.getPending(1000).then((events) => events.length)
  }
}

function makeEntry(id: string, content: string, version = 1): WorkEntryDTO {
  return {
    id,
    ownerId: 'owner',
    projectId: null,
    content,
    contentPlain: null,
    entryType: 'task',
    status: 'active',
    importance: 0,
    source: 'manual',
    occurredAt: '2024-06-01T00:00:00.000Z',
    aiStatus: 'pending',
    aiSummary: null,
    aiMetadata: {},
    version,
    deviceId: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    deletedAt: null,
  }
}

function makeStore(): WorklogStore & { data: Map<string, WorkEntryDTO> } {
  const data = new Map<string, WorkEntryDTO>()
  let counter = 0

  const store: WorklogStore = {
    entries: {
      async create(input) {
        const id = `entry-${++counter}`
        const entry = makeEntry(id, input.content)
        data.set(id, entry)
        return entry
      },
      async update(id, input) {
        const existing = data.get(id)
        if (!existing) throw new Error(`Entry ${id} not found`)
        const updated: WorkEntryDTO = {
          ...existing,
          ...('content' in input && input.content !== undefined
            ? { content: input.content }
            : {}),
          ...('entryType' in input && input.entryType !== undefined
            ? { entryType: input.entryType }
            : {}),
          ...('importance' in input && input.importance !== undefined
            ? { importance: input.importance }
            : {}),
          version: existing.version + 1,
          updatedAt: new Date().toISOString(),
        }
        data.set(id, updated)
        return updated
      },
      async delete(id) {
        data.delete(id)
      },
      async getById(id) {
        return data.get(id) || null
      },
      async list() {
        return Array.from(data.values())
      },
      async upsert(entry) {
        const full: WorkEntryDTO = { ...entry, ownerId: 'owner', deletedAt: null }
        data.set(entry.id, full)
        return full
      },
    },
    projects: {
      async create() {
        throw new Error('not implemented')
      },
      async update() {
        throw new Error('not implemented')
      },
      async delete() {},
      async list() {
        return []
      },
    },
    tags: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented')
      },
    },
    achievements: {
      async list() {
        return []
      },
      async create() {
        throw new Error('not implemented')
      },
    },
    reports: {
      async create() {
        throw new Error('not implemented')
      },
      async getById() {
        return null
      },
      async list() {
        return []
      },
    },
    search: {
      async search() {
        return []
      },
    },
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      return fn(store)
    },
    async getSchemaVersion() {
      return 1
    },
  }

  return Object.assign(store, { data })
}

describe('sync engine', () => {
  it('syncs a create event to the remote store', async () => {
    const outbox = new FakeOutbox()
    const local = makeStore()
    const remote = makeStore()

    const localEntry = await local.entries.create({
      content: 'Shipped the release',
    })
    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: localEntry.id,
      operation: 'create',
      payload: JSON.stringify({ entry: localEntry }),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })
    await engine.processBatch()

    const remoteEntry = await remote.entries.getById(localEntry.id)
    expect(remoteEntry).not.toBeNull()
    expect(remoteEntry!.content).toBe('Shipped the release')

    const event = await outbox.getById('evt-1')
    expect(event!.state).toBe('succeeded')
    expect(engine.getStats().succeeded).toBe(1)
  })

  it('updates the remote entry when local version is newer', async () => {
    const outbox = new FakeOutbox()
    const local = makeStore()
    const remote = makeStore()

    const entry = makeEntry('e1', 'v1 content', 1)
    local.data.set('e1', entry)
    remote.data.set('e1', makeEntry('e1', 'old content', 1))

    const updated = { ...entry, content: 'v2 content', version: 2 }
    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: 'e1',
      operation: 'update',
      payload: JSON.stringify({ entry: updated }),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })
    await engine.processBatch()

    const remoteEntry = await remote.entries.getById('e1')
    expect(remoteEntry!.content).toBe('v2 content')
  })

  it('skips update when remote version is not older', async () => {
    const outbox = new FakeOutbox()
    const local = makeStore()
    const remote = makeStore()

    local.data.set('e1', makeEntry('e1', 'local content', 1))
    remote.data.set('e1', makeEntry('e1', 'remote newer content', 5))

    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: 'e1',
      operation: 'update',
      payload: JSON.stringify({ entry: makeEntry('e1', 'local content', 1) }),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })
    await engine.processBatch()

    const remoteEntry = await remote.entries.getById('e1')
    expect(remoteEntry!.content).toBe('remote newer content')
    expect(remoteEntry!.version).toBe(5)
  })

  it('syncs a delete event to the remote store', async () => {
    const outbox = new FakeOutbox()
    const remote = makeStore()

    remote.data.set('e1', makeEntry('e1', 'to delete'))

    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: 'e1',
      operation: 'delete',
      payload: JSON.stringify({ id: 'e1' }),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })
    await engine.processBatch()

    expect(await remote.entries.getById('e1')).toBeNull()
  })

  it('marks failed events with retry metadata', async () => {
    const outbox = new FakeOutbox()
    const remote = makeStore()

    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: 'missing',
      operation: 'create',
      payload: JSON.stringify({}),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })
    await engine.processBatch()

    const event = await outbox.getById('evt-1')
    expect(event!.state).toBe('failed')
    expect(event!.attempts).toBe(1)
    expect(event!.lastError).toContain('Missing entry')
    expect(event!.nextRetryAt).not.toBeNull()
    expect(engine.getStats().failed).toBe(1)
  })

  it('dead-letters events after exhausting attempts', async () => {
    const outbox = new FakeOutbox()
    const remote = makeStore()

    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: 'missing',
      operation: 'create',
      payload: JSON.stringify({}),
    })

    const engine = createSyncEngine({
      outbox,
      remoteStore: remote,
    })

    for (let i = 0; i < 10; i++) {
      await engine.processBatch()
    }

    const event = await outbox.getById('evt-1')
    expect(event!.state).toBe('dead_letter')
    expect(engine.getStats().deadLetter).toBe(1)
  })

  it('stop clears the polling interval', async () => {
    const outbox = new FakeOutbox()
    const engine = createSyncEngine({
      outbox,
      remoteStore: makeStore(),
      pollIntervalMs: 10,
    })

    engine.start()
    engine.stop()
    expect(engine.getStats().pending).toBe(0)
  })
})
