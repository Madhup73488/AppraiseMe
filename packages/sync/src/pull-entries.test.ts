import { describe, it, expect } from 'vitest'
import { pullEntries } from './pull-entries.js'
import { createMemoryStore } from '@appraiseme/storage-memory'

describe('pullEntries', () => {
  it('copies remote entries missing locally', async () => {
    const local = createMemoryStore('local-owner')
    const remote = createMemoryStore('remote-owner')

    await remote.entries.create({ content: 'Remote only' })
    await local.entries.create({ content: 'Local only' })

    const result = await pullEntries({ localStore: local, remoteStore: remote })

    expect(result.pulled).toBe(1)
    expect(result.skipped).toBe(0)

    const list = await local.entries.list({ limit: 100 })
    expect(list.some((e) => e.content === 'Remote only')).toBe(true)
    expect(list.some((e) => e.content === 'Local only')).toBe(true)
  })

  it('preserves the remote entry id and content', async () => {
    const local = createMemoryStore('local-owner')
    const remote = createMemoryStore('remote-owner')

    const created = await remote.entries.create({
      content: 'Keep my id',
      entryType: 'task',
    })

    await pullEntries({ localStore: local, remoteStore: remote })

    const pulled = await local.entries.getById(created.id)
    expect(pulled).not.toBeNull()
    expect(pulled!.content).toBe('Keep my id')
    expect(pulled!.entryType).toBe('task')
  })

  it('skips entries that already exist locally', async () => {
    const local = createMemoryStore('local-owner')
    const remote = createMemoryStore('remote-owner')

    const created = await remote.entries.create({ content: 'Shared' })
    const { ownerId: _o, deletedAt: _d, ...upsert } = created
    await local.entries.upsert(upsert)

    const result = await pullEntries({ localStore: local, remoteStore: remote })

    expect(result.pulled).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('does not overwrite local edits on pull', async () => {
    const local = createMemoryStore('local-owner')
    const remote = createMemoryStore('remote-owner')

    const remoteEntry = await remote.entries.create({ content: 'Original' })
    const { ownerId: _o, deletedAt: _d, ...upsert } = remoteEntry
    const localCopy = await local.entries.upsert(upsert)
    await local.entries.update(localCopy.id, { content: 'Local edit' })

    await pullEntries({ localStore: local, remoteStore: remote })

    const entry = await local.entries.getById(localCopy.id)
    expect(entry!.content).toBe('Local edit')
  })
})
