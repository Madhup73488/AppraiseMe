import { describe, it, expect } from 'vitest'
import { createLocalOutbox } from './local-outbox.js'

function createMemoryStorage(): Storage & { dump(): Record<string, string> } {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size
    },
    dump: () => Object.fromEntries(data),
  }
}

function enqueueEvent(
  outbox: ReturnType<typeof createLocalOutbox>,
  entityId = 'entry-1',
  operation: 'create' | 'update' | 'delete' = 'create',
): Promise<string> {
  return outbox.enqueue({
    entityType: 'work_entry',
    entityId,
    operation,
    payload: JSON.stringify({}),
  })
}

describe('local outbox', () => {
  it('enqueues and returns pending events in order', async () => {
    const outbox = createLocalOutbox({ storage: null })
    await enqueueEvent(outbox, 'e1')
    await enqueueEvent(outbox, 'e2')

    const pending = await outbox.getPending()
    expect(pending.map((e) => e.entityId)).toEqual(['e1', 'e2'])
    expect(await outbox.countPending()).toBe(2)
  })

  it('removes succeeded events', async () => {
    const outbox = createLocalOutbox({ storage: null })
    const id = await enqueueEvent(outbox)

    await outbox.markProcessing(id)
    await outbox.markSucceeded(id)

    expect(await outbox.getPending()).toEqual([])
    expect(await outbox.getById(id)).toBeNull()
    expect(await outbox.countPending()).toBe(0)
  })

  it('excludes failed events from pending until nextRetryAt passes', async () => {
    const outbox = createLocalOutbox({ storage: null })
    const id = await enqueueEvent(outbox)

    await outbox.markFailed(id, 'network down', new Date(Date.now() + 60_000).toISOString())

    expect(await outbox.countPending()).toBe(0)

    await outbox.markFailed(id, 'network down', new Date(Date.now() - 1).toISOString())

    expect(await outbox.countPending()).toBe(1)
  })

  it('keeps dead-lettered events for inspection', async () => {
    const outbox = createLocalOutbox({ storage: null })
    const id = await enqueueEvent(outbox)

    await outbox.markDeadLetter(id, 'permanent failure')

    const event = await outbox.getById(id)
    expect(event!.state).toBe('dead_letter')
    expect(event!.lastError).toBe('permanent failure')
    expect(await outbox.countPending()).toBe(0)
  })

  it('persists events to storage and recovers stuck processing events', async () => {
    const storage = createMemoryStorage()
    const outbox = createLocalOutbox({ storage })
    const id = await enqueueEvent(outbox, 'e1')
    await outbox.markProcessing(id)

    const restored = createLocalOutbox({ storage })
    const event = await restored.getById(id)
    expect(event).not.toBeNull()
    expect(event!.state).toBe('pending')
    expect(await restored.countPending()).toBe(1)
  })

  it('starts fresh when storage holds corrupted data', async () => {
    const storage = createMemoryStorage()
    storage.setItem('appraiseme:outbox', '{not json')

    const outbox = createLocalOutbox({ storage })
    expect(await outbox.countPending()).toBe(0)
  })

  it('runs without storage', async () => {
    const outbox = createLocalOutbox({ storage: null })
    await enqueueEvent(outbox)
    expect(await outbox.countPending()).toBe(1)
    outbox.clear()
    expect(await outbox.countPending()).toBe(0)
  })
})
