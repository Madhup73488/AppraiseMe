import { describe, it, expect } from 'vitest'
import { createMemoryStore, createPersistentStore } from '../index.js'

class FakeStorage implements Storage {
  private data = new Map<string, string>()
  readonly length: number = 0

  clear(): void {
    this.data.clear()
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  key(): string | null {
    return null
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

describe('persistent store', () => {
  it('persists entries across store instances', async () => {
    const storage = new FakeStorage()

    const first = createPersistentStore('user-1', { storage })
    const created = await first.entries.create({ content: 'Persisted note' })
    await first.projects.create({ name: 'Apollo' })

    const second = createPersistentStore('user-1', { storage })
    const fetched = await second.entries.getById(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.content).toBe('Persisted note')

    const projects = await second.projects.list()
    expect(projects.map((p) => p.name)).toEqual(['Apollo'])
  })

  it('keeps deleted entries deleted after reload', async () => {
    const storage = new FakeStorage()

    const first = createPersistentStore('user-1', { storage })
    const created = await first.entries.create({ content: 'temp' })
    await first.entries.delete(created.id)

    const second = createPersistentStore('user-1', { storage })
    expect(await second.entries.getById(created.id)).toBeNull()
  })

  it('isolates data per owner', async () => {
    const storage = new FakeStorage()

    const alice = createPersistentStore('alice', { storage })
    const created = await alice.entries.create({ content: 'alice note' })

    const bob = createPersistentStore('bob', { storage })
    expect(await bob.entries.getById(created.id)).toBeNull()
    expect(await bob.entries.list({})).toEqual([])
  })

  it('ignores corrupted storage content', async () => {
    const storage = new FakeStorage()
    storage.setItem('appraiseme:worklog:user-1', '{not json')

    const store = createPersistentStore('user-1', { storage })
    expect(await store.entries.list({})).toEqual([])
  })

  it('ignores snapshots with unexpected shape', async () => {
    const storage = new FakeStorage()
    storage.setItem(
      'appraiseme:worklog:user-1',
      JSON.stringify({ version: 99, entries: 'nope' }),
    )

    const store = createPersistentStore('user-1', { storage })
    expect(await store.entries.list({})).toEqual([])
  })

  it('runs in memory when no storage is available', async () => {
    const store = createPersistentStore('user-1', { storage: null })
    const created = await store.entries.create({ content: 'memory only' })
    expect(created.content).toBe('memory only')
  })
})

describe('memory store snapshot', () => {
  it('round-trips through snapshot and hydrate', async () => {
    const source = createMemoryStore('owner')
    const entry = await source.entries.create({ content: 'snapshot me' })
    await source.entries.delete(entry.id)
    const project = await source.projects.create({ name: 'Keep' })

    const snapshot = source.snapshot()

    const target = createMemoryStore('owner')
    target.hydrate(snapshot)

    expect(await target.entries.getById(entry.id)).toBeNull()
    const projects = await target.projects.list()
    expect(projects.map((p) => p.id)).toEqual([project.id])
  })
})
