import type { WorklogStore } from '@appraiseme/contracts'
import { createMemoryStore, type StoreSnapshot } from './memory-store.js'

const STORAGE_PREFIX = 'appraiseme:worklog:'

export interface PersistentStoreOptions {
  storage?: Storage | null
}

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`
}

function isValidSnapshot(value: unknown): value is StoreSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<StoreSnapshot>
  return (
    snapshot.version === 1 &&
    Array.isArray(snapshot.entries) &&
    Array.isArray(snapshot.projects) &&
    Array.isArray(snapshot.tags) &&
    Array.isArray(snapshot.achievements) &&
    Array.isArray(snapshot.reports)
  )
}

function resolveStorage(options?: PersistentStoreOptions): Storage | null {
  if (options?.storage) return options.storage
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

export function createPersistentStore(
  ownerId: string,
  options?: PersistentStoreOptions,
): WorklogStore {
  const memory = createMemoryStore(ownerId)
  const storage = resolveStorage(options)

  if (storage) {
    try {
      const raw = storage.getItem(storageKey(ownerId))
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isValidSnapshot(parsed)) {
          memory.hydrate(parsed)
        }
      }
    } catch {
      // corrupted or unavailable storage — start fresh
    }
  }

  function persist(): void {
    if (!storage) return
    try {
      storage.setItem(storageKey(ownerId), JSON.stringify(memory.snapshot()))
    } catch {
      // quota exceeded or storage unavailable — keep running in memory
    }
  }

  function after<T>(promise: Promise<T>): Promise<T> {
    return promise.then(
      (result) => {
        persist()
        return result
      },
      (error) => {
        throw error
      },
    )
  }

  return {
    entries: {
      create: (input) => after(memory.entries.create(input)),
      update: (id, input) => after(memory.entries.update(id, input)),
      delete: (id) => after(memory.entries.delete(id)),
      getById: (id) => memory.entries.getById(id),
      list: (input) => memory.entries.list(input),
      upsert: (entry) => after(memory.entries.upsert(entry)),
    },
    projects: {
      create: (input) => after(memory.projects.create(input)),
      update: (id, input) => after(memory.projects.update(id, input)),
      delete: (id) => after(memory.projects.delete(id)),
      list: () => memory.projects.list(),
    },
    tags: {
      list: () => memory.tags.list(),
      create: (name) => after(memory.tags.create(name)),
    },
    achievements: {
      list: () => memory.achievements.list(),
      create: (input) => after(memory.achievements.create(input)),
    },
    reports: {
      create: (input) => after(memory.reports.create(input)),
      getById: (id) => memory.reports.getById(id),
      list: () => memory.reports.list(),
    },
    search: {
      search: (query, filters) => memory.search.search(query, filters),
    },
    async transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T> {
      const result = await memory.transaction(fn)
      persist()
      return result
    },
    getSchemaVersion: () => memory.getSchemaVersion(),
  }
}
