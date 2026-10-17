import { describe, it, expect, vi } from 'vitest'
import { createSyncManager } from './sync-manager.js'
import { createLocalOutbox } from '@appraiseme/sync'
import { createMemoryStore } from '@appraiseme/storage-memory'
import type { RemoteStoreHandle } from './sync-manager.js'
import type { WorklogStore } from '@appraiseme/contracts'

function makeRemote(ownerId: string): RemoteStoreHandle & { store: WorklogStore } {
  const store = createMemoryStore(ownerId)
  const close = vi.fn(async () => {})
  return { store, close }
}

describe('createSyncManager', () => {
  it('connects, pulls remote entries, and pushes pending events', async () => {
    const local = createMemoryStore('local-owner')
    const outbox = createLocalOutbox({ storage: null })
    const remote = makeRemote('remote-owner')

    await remote.store.entries.create({ content: 'From remote' })
    const captured = await local.entries.create({ content: 'Captured offline' })
    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: captured.id,
      operation: 'create',
      payload: JSON.stringify({ entry: captured }),
    })

    const manager = createSyncManager({
      localStore: local,
      outbox,
      createRemoteStore: async () => remote,
    })

    await manager.connect()

    expect(manager.getState().status).toBe('connected')
    expect(manager.getState().schemaVersion).toBe(1)

    const localList = await local.entries.list({ limit: 100 })
    expect(localList.some((e) => e.content === 'From remote')).toBe(true)

    const remoteList = await remote.store.entries.list({ limit: 100 })
    expect(
      remoteList.some((e) => e.content === 'Captured offline'),
    ).toBe(true)

    expect(manager.getState().pending).toBe(0)
    manager.dispose()
  })

  it('reports an error state when the remote store cannot be reached', async () => {
    const manager = createSyncManager({
      localStore: createMemoryStore('local-owner'),
      outbox: createLocalOutbox({ storage: null }),
      createRemoteStore: async () => {
        throw new Error('connection refused')
      },
    })

    await manager.connect()

    expect(manager.getState().status).toBe('error')
    expect(manager.getState().error).toBe('connection refused')
    manager.dispose()
  })

  it('disconnects and stops syncing', async () => {
    const local = createMemoryStore('local-owner')
    const outbox = createLocalOutbox({ storage: null })
    const remote = makeRemote('remote-owner')

    const manager = createSyncManager({
      localStore: local,
      outbox,
      createRemoteStore: async () => remote,
    })

    await manager.connect()
    await manager.disconnect()

    expect(manager.getState().status).toBe('disconnected')
    expect(remote.close).toHaveBeenCalledTimes(1)

    const entry = await local.entries.create({ content: 'After disconnect' })
    await outbox.enqueue({
      entityType: 'work_entry',
      entityId: entry.id,
      operation: 'create',
      payload: JSON.stringify({ entry }),
    })
    await manager.syncNow()

    const remoteList = await remote.store.entries.list({ limit: 100 })
    expect(
      remoteList.some((e) => e.content === 'After disconnect'),
    ).toBe(false)
  })

  it('notifies subscribers on state changes', async () => {
    const listener = vi.fn()
    const remote = makeRemote('remote-owner')

    const manager = createSyncManager({
      localStore: createMemoryStore('local-owner'),
      outbox: createLocalOutbox({ storage: null }),
      createRemoteStore: async () => remote,
    })

    const unsubscribe = manager.subscribe(listener)
    await manager.connect()

    expect(listener).toHaveBeenCalled()
    expect(manager.getState().status).toBe('connected')

    unsubscribe()
    const calls = listener.mock.calls.length
    await manager.disconnect()
    expect(listener).toHaveBeenCalledTimes(calls)

    manager.dispose()
  })

  it('guards against double connect', async () => {
    const remote = makeRemote('remote-owner')
    const createRemoteStore = vi.fn(async () => remote)

    const manager = createSyncManager({
      localStore: createMemoryStore('local-owner'),
      outbox: createLocalOutbox({ storage: null }),
      createRemoteStore,
    })

    await manager.connect()
    await manager.connect()

    expect(createRemoteStore).toHaveBeenCalledTimes(1)
    manager.dispose()
  })
})
