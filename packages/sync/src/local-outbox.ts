import type { OutboxEvent, OutboxStore } from './types.js'

const STORAGE_KEY = 'appraiseme:outbox'

export interface LocalOutboxOptions {
  storage?: Storage | null
}

interface StoredOutbox {
  version: 1
  events: OutboxEvent[]
  counter: number
}

function isValidStored(value: unknown): value is StoredOutbox {
  if (!value || typeof value !== 'object') return false
  const stored = value as Partial<StoredOutbox>
  return (
    stored.version === 1 &&
    Array.isArray(stored.events) &&
    typeof stored.counter === 'number'
  )
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

function resolveStorage(options?: LocalOutboxOptions): Storage | null {
  if (options && 'storage' in options) return options.storage ?? null
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

export function createLocalOutbox(
  options?: LocalOutboxOptions,
): OutboxStore & { clear(): void } {
  const storage = resolveStorage(options)
  let events: OutboxEvent[] = []
  let counter = 0

  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isValidStored(parsed)) {
          events = parsed.events
          counter = parsed.counter
        }
      }
    } catch {
      // corrupted or unavailable storage — start fresh
    }
  }

  events = events.map((event) =>
    event.state === 'processing'
      ? { ...event, state: 'pending' as const }
      : event,
  )

  function persist(): void {
    if (!storage) return
    try {
      const stored: StoredOutbox = { version: 1, events, counter }
      storage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // quota exceeded or storage unavailable — keep running in memory
    }
  }

  function isRetryable(event: OutboxEvent, now: number): boolean {
    if (event.state !== 'pending' && event.state !== 'failed') return false
    if (!event.nextRetryAt) return true
    return new Date(event.nextRetryAt).getTime() <= now
  }

  return {
    async enqueue(event): Promise<string> {
      counter++
      const id = `outbox-${counter}-${randomUUID()}`
      const full: OutboxEvent = {
        ...event,
        id,
        state: 'pending',
        attempts: 0,
        lastError: null,
        nextRetryAt: null,
        createdAt: new Date().toISOString(),
        processedAt: null,
      }
      events.push(full)
      persist()
      return id
    },

    async getPending(limit = 10): Promise<OutboxEvent[]> {
      const now = Date.now()
      return events
        .filter((e) => isRetryable(e, now))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit)
    },

    async markProcessing(id: string): Promise<void> {
      const event = events.find((e) => e.id === id)
      if (event) {
        event.state = 'processing'
        persist()
      }
    },

    async markSucceeded(id: string): Promise<void> {
      events = events.filter((e) => e.id !== id)
      persist()
    },

    async markFailed(
      id: string,
      error: string,
      nextRetryAt: string,
    ): Promise<void> {
      const event = events.find((e) => e.id === id)
      if (event) {
        event.state = 'failed'
        event.attempts += 1
        event.lastError = error
        event.nextRetryAt = nextRetryAt
        persist()
      }
    },

    async markDeadLetter(id: string, error: string): Promise<void> {
      const event = events.find((e) => e.id === id)
      if (event) {
        event.state = 'dead_letter'
        event.attempts += 1
        event.lastError = error
        persist()
      }
    },

    async getById(id: string): Promise<OutboxEvent | null> {
      return events.find((e) => e.id === id) || null
    },

    async countPending(): Promise<number> {
      const now = Date.now()
      return events.filter((e) => isRetryable(e, now)).length
    },

    clear(): void {
      events = []
      counter = 0
      persist()
    },
  }
}
