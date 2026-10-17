import type {
  WorklogStore,
  WorkEntryDTO,
} from '@appraiseme/contracts'
import type { OutboxStore } from './types.js'
import { shouldDeadLetter, nextRetryTime } from './backoff.js'

export interface SyncEngineOptions {
  outbox: OutboxStore
  remoteStore: WorklogStore
  pollIntervalMs?: number
  batchSize?: number
  onStats?: (stats: SyncStats) => void
}

export interface SyncEngine {
  start(): void
  stop(): void
  processBatch(): Promise<void>
  getStats(): SyncStats
}

export interface SyncStats {
  pending: number
  processing: number
  succeeded: number
  failed: number
  deadLetter: number
}

export function createSyncEngine(opts: SyncEngineOptions): SyncEngine {
  const { outbox, remoteStore } = opts
  const pollIntervalMs = opts.pollIntervalMs ?? 5000
  const batchSize = opts.batchSize ?? 10
  let intervalId: ReturnType<typeof setInterval> | null = null
  let processing = false

  const stats: SyncStats = {
    pending: 0,
    processing: 0,
    succeeded: 0,
    failed: 0,
    deadLetter: 0,
  }

  async function syncEvent(
    entityId: string,
    operation: string,
    payload: string,
  ): Promise<void> {
    const data = JSON.parse(payload) as {
      entry?: WorkEntryDTO
    }

    if (operation === 'create' || operation === 'update') {
      if (!data.entry) throw new Error('Missing entry in payload')
      const existing = await remoteStore.entries.getById(entityId)
      if (existing && existing.version >= data.entry.version) {
        return
      }
      const { ownerId: _ownerId, deletedAt: _deletedAt, ...upsert } = data.entry
      await remoteStore.entries.upsert(upsert)
    } else if (operation === 'delete') {
      await remoteStore.entries.delete(entityId)
    }
  }

  async function processBatch(): Promise<void> {
    if (processing) return
    processing = true

    try {
      const events = await outbox.getPending(batchSize)

      for (const event of events) {
        try {
          await outbox.markProcessing(event.id)
          stats.processing++

          await syncEvent(event.entityId, event.operation, event.payload)

          await outbox.markSucceeded(event.id)
          stats.succeeded++
          stats.processing--
        } catch (err) {
          const attempts = event.attempts + 1
          const errorMsg = err instanceof Error ? err.message : String(err)

          if (shouldDeadLetter(attempts)) {
            await outbox.markDeadLetter(event.id, errorMsg)
            stats.deadLetter++
          } else {
            await outbox.markFailed(event.id, errorMsg, nextRetryTime(attempts))
            stats.failed++
          }
          stats.processing--
        }
      }
      stats.pending = await outbox.countPending()
      opts.onStats?.({ ...stats })
    } finally {
      processing = false
    }
  }

  function start(): void {
    if (intervalId) return
    intervalId = setInterval(() => {
      processBatch().catch(() => {})
    }, pollIntervalMs)
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function getStats(): SyncStats {
    return { ...stats }
  }

  return { start, stop, processBatch, getStats }
}
