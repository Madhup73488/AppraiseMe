import type { WorklogStore } from '@appraiseme/contracts'
import {
  createSyncEngine,
  pullEntries,
  type OutboxStore,
  type SyncEngine,
  type SyncStats,
} from '@appraiseme/sync'

export interface RemoteStoreHandle {
  store: WorklogStore
  close(): Promise<void>
}

export type CreateRemoteStore = () => Promise<RemoteStoreHandle>

export type SyncManagerStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export interface SyncManagerState {
  status: SyncManagerStatus
  pending: number
  deadLetter: number
  schemaVersion: number | null
  error: string | null
  lastPulledAt: string | null
  lastPulledCount: number
}

export interface SyncManagerOptions {
  localStore: WorklogStore
  outbox: OutboxStore
  createRemoteStore: CreateRemoteStore
  pollIntervalMs?: number
  statsIntervalMs?: number
}

export interface SyncManager {
  connect(): Promise<void>
  disconnect(): Promise<void>
  syncNow(): Promise<void>
  getState(): SyncManagerState
  getStats(): SyncStats | null
  subscribe(listener: (state: SyncManagerState) => void): () => void
  dispose(): void
}

const initialState: SyncManagerState = {
  status: 'disconnected',
  pending: 0,
  deadLetter: 0,
  schemaVersion: null,
  error: null,
  lastPulledAt: null,
  lastPulledCount: 0,
}

export function createSyncManager(opts: SyncManagerOptions): SyncManager {
  const listeners = new Set<(state: SyncManagerState) => void>()
  let state: SyncManagerState = { ...initialState }
  let engine: SyncEngine | null = null
  let remote: RemoteStoreHandle | null = null
  let statsTimer: ReturnType<typeof setInterval> | null = null
  let stats: SyncStats | null = null

  function setState(patch: Partial<SyncManagerState>): void {
    state = { ...state, ...patch }
    for (const listener of listeners) listener(state)
  }

  function emitStats(next: SyncStats): void {
    stats = next
    setState({
      pending: next.pending,
      deadLetter: next.deadLetter,
    })
  }

  async function refreshPending(): Promise<void> {
    setState({ pending: await opts.outbox.countPending() })
  }

  async function connect(): Promise<void> {
    if (state.status === 'connecting' || state.status === 'connected') return
    setState({ status: 'connecting', error: null })

    try {
      remote = await opts.createRemoteStore()
      const schemaVersion = await remote.store.getSchemaVersion()
      const result = await pullEntries({
        localStore: opts.localStore,
        remoteStore: remote.store,
      })

      engine = createSyncEngine({
        outbox: opts.outbox,
        remoteStore: remote.store,
        pollIntervalMs: opts.pollIntervalMs,
        onStats: emitStats,
      })
      engine.start()

      statsTimer = setInterval(() => {
        void refreshPending()
      }, opts.statsIntervalMs ?? 2000)

      setState({
        status: 'connected',
        schemaVersion,
        lastPulledAt: new Date().toISOString(),
        lastPulledCount: result.pulled,
        error: null,
      })
      await refreshPending()
      await syncNow()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      if (remote) {
        try {
          await remote.close()
        } catch {
          // best effort cleanup
        }
        remote = null
      }
      if (engine) {
        engine.stop()
        engine = null
      }
      setState({ status: 'error', error: message })
    }
  }

  async function disconnect(): Promise<void> {
    if (statsTimer) {
      clearInterval(statsTimer)
      statsTimer = null
    }
    if (engine) {
      engine.stop()
      engine = null
    }
    stats = null
    if (remote) {
      try {
        await remote.close()
      } catch {
        // best effort cleanup
      }
      remote = null
    }
    setState({ status: 'disconnected', schemaVersion: null, error: null })
  }

  async function syncNow(): Promise<void> {
    if (!engine) return
    await engine.processBatch()
  }

  function subscribe(
    listener: (state: SyncManagerState) => void,
  ): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function dispose(): void {
    void disconnect()
  }

  return {
    connect,
    disconnect,
    syncNow,
    getState: () => state,
    getStats: () => stats,
    subscribe,
    dispose,
  }
}
