import type { WorklogStore } from '@appraiseme/contracts'

export interface PullEntriesOptions {
  localStore: WorklogStore
  remoteStore: WorklogStore
  limit?: number
}

export interface PullEntriesResult {
  pulled: number
  skipped: number
}

export async function pullEntries(
  opts: PullEntriesOptions,
): Promise<PullEntriesResult> {
  const limit = opts.limit ?? 500
  const remote = await opts.remoteStore.entries.list({ limit })
  let pulled = 0
  let skipped = 0

  for (const entry of remote) {
    const existing = await opts.localStore.entries.getById(entry.id)
    if (existing) {
      skipped++
      continue
    }
    const { ownerId: _ownerId, deletedAt: _deletedAt, ...input } = entry
    await opts.localStore.entries.upsert(input)
    pulled++
  }

  return { pulled, skipped }
}
