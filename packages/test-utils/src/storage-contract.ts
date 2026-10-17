import { describe, it, expect, afterAll } from 'vitest'
import type { WorklogStore } from '@appraiseme/contracts'

export function runWorklogStoreContractTests(
  name: string,
  createStore: () => Promise<WorklogStore>,
  teardown?: () => Promise<void>,
) {
  describe(`${name} — WorklogStore contract`, () => {
    let store: WorklogStore

    it('returns schema version', async () => {
      store = await createStore()
      const version = await store.getSchemaVersion()
      expect(version).toBeGreaterThan(0)
    })

    describe('entries', () => {
      it('creates and retrieves an entry', async () => {
        const created = await store.entries.create({
          content: 'Test entry content',
          entryType: 'achievement',
        })

        expect(created.id).toBeDefined()
        expect(created.content).toBe('Test entry content')
        expect(created.entryType).toBe('achievement')
        expect(created.status).toBe('active')
        expect(created.version).toBe(1)

        const fetched = await store.entries.getById(created.id)
        expect(fetched).not.toBeNull()
        expect(fetched!.content).toBe('Test entry content')
      })

      it('updates an entry', async () => {
        const created = await store.entries.create({
          content: 'Original content',
        })

        const updated = await store.entries.update(created.id, {
          content: 'Updated content',
          importance: 5,
        })

        expect(updated.content).toBe('Updated content')
        expect(updated.importance).toBe(5)
        expect(updated.version).toBe(2)
      })

      it('updates AI enrichment fields', async () => {
        const created = await store.entries.create({
          content: 'Entry to enrich',
        })
        expect(created.aiStatus).toBe('pending')
        expect(created.aiSummary).toBeNull()

        const metadata = { content_hash: 'abc123', confidence: 0.9 }
        const updated = await store.entries.update(created.id, {
          aiStatus: 'completed',
          aiSummary: 'Shipped the payment service',
          aiMetadata: metadata,
        })

        expect(updated.aiStatus).toBe('completed')
        expect(updated.aiSummary).toBe('Shipped the payment service')
        expect(updated.aiMetadata).toEqual(metadata)

        const cleared = await store.entries.update(created.id, {
          aiSummary: null,
        })
        expect(cleared.aiSummary).toBeNull()
        expect(cleared.aiStatus).toBe('completed')
      })

      it('soft-deletes an entry', async () => {
        const created = await store.entries.create({
          content: 'To be deleted',
        })

        await store.entries.delete(created.id)

        const fetched = await store.entries.getById(created.id)
        expect(fetched).toBeNull()
      })

      it('upserts an entry with a stable id', async () => {
        const created = await store.entries.create({
          content: 'Original content',
        })

        const { ownerId: _ownerId, deletedAt: _deletedAt, ...upsert } = created
        await store.entries.upsert({
          ...upsert,
          content: 'Upserted content',
          version: 3,
          aiStatus: 'succeeded',
          aiSummary: 'AI summary',
        })

        const fetched = await store.entries.getById(created.id)
        expect(fetched).not.toBeNull()
        expect(fetched!.content).toBe('Upserted content')
        expect(fetched!.version).toBe(3)
        expect(fetched!.aiSummary).toBe('AI summary')
      })

      it('upserts an entry that does not exist yet', async () => {
        const existing = await store.entries.create({ content: 'Seed' })
        const { ownerId: _o, deletedAt: _d, ...template } = existing

        await store.entries.upsert({
          ...template,
          id: 'synced-from-remote-id',
          content: 'Pulled from remote',
        })

        const fetched = await store.entries.getById('synced-from-remote-id')
        expect(fetched).not.toBeNull()
        expect(fetched!.content).toBe('Pulled from remote')
      })

      it('lists entries ordered by occurred_at desc', async () => {
        await store.entries.create({
          content: 'Entry A',
          occurredAt: new Date('2024-01-01').toISOString(),
        })
        await store.entries.create({
          content: 'Entry B',
          occurredAt: new Date('2024-03-01').toISOString(),
        })
        await store.entries.create({
          content: 'Entry C',
          occurredAt: new Date('2024-02-01').toISOString(),
        })

        const list = await store.entries.list({})
        expect(list.length).toBeGreaterThanOrEqual(3)
        const contents = list.map((e) => e.content)
        expect(contents.indexOf('Entry B')).toBeLessThan(
          contents.indexOf('Entry C'),
        )
        expect(contents.indexOf('Entry C')).toBeLessThan(
          contents.indexOf('Entry A'),
        )
      })

      it('filters by dateRange', async () => {
        await store.entries.create({
          content: 'Jan entry',
          occurredAt: new Date('2024-01-15').toISOString(),
        })
        await store.entries.create({
          content: 'Mar entry',
          occurredAt: new Date('2024-03-15').toISOString(),
        })

        const list = await store.entries.list({
          dateRange: {
            from: new Date('2024-02-01').toISOString(),
            to: new Date('2024-04-01').toISOString(),
          },
        })

        const contents = list.map((e) => e.content)
        expect(contents).toContain('Mar entry')
        expect(contents).not.toContain('Jan entry')
      })
    })

    describe('projects', () => {
      it('creates and lists projects', async () => {
        const created = await store.projects.create({
          name: 'Project Alpha',
          description: 'First project',
        })

        expect(created.id).toBeDefined()
        expect(created.name).toBe('Project Alpha')
        expect(created.description).toBe('First project')
        expect(created.status).toBe('active')

        const list = await store.projects.list()
        expect(list.some((p) => p.id === created.id)).toBe(true)
      })

      it('updates a project', async () => {
        const created = await store.projects.create({ name: 'Original' })
        const updated = await store.projects.update(created.id, {
          name: 'Updated',
          status: 'archived',
        })

        expect(updated.name).toBe('Updated')
        expect(updated.status).toBe('archived')
        expect(updated.version).toBe(2)
      })

      it('soft-deletes a project', async () => {
        const created = await store.projects.create({ name: 'ToDelete' })
        await store.projects.delete(created.id)

        const list = await store.projects.list()
        expect(list.some((p) => p.id === created.id)).toBe(false)
      })
    })

    describe('tags', () => {
      it('creates and lists tags', async () => {
        const created = await store.tags.create('urgent')
        expect(created.id).toBeDefined()
        expect(created.name).toBe('urgent')

        const list = await store.tags.list()
        expect(list.some((t) => t.id === created.id)).toBe(true)
      })
    })

    describe('achievements', () => {
      it('creates and lists achievements', async () => {
        const created = await store.achievements.create({
          title: 'Shipped v2',
          description: 'Major release',
          impact: 'Increased retention by 20%',
        })

        expect(created.id).toBeDefined()
        expect(created.title).toBe('Shipped v2')
        expect(created.impact).toBe('Increased retention by 20%')

        const list = await store.achievements.list()
        expect(list.some((a) => a.id === created.id)).toBe(true)
      })
    })

    describe('reports', () => {
      it('creates and retrieves a report', async () => {
        const created = await store.reports.create({
          title: 'Q1 Review',
          reportType: 'quarterly',
          dateFrom: new Date('2024-01-01').toISOString(),
          dateTo: new Date('2024-03-31').toISOString(),
        })

        expect(created.id).toBeDefined()
        expect(created.title).toBe('Q1 Review')
        expect(created.status).toBe('draft')

        const fetched = await store.reports.getById(created.id)
        expect(fetched).not.toBeNull()
        expect(fetched!.title).toBe('Q1 Review')
      })

      it('lists reports', async () => {
        await store.reports.create({
          title: 'Report A',
          reportType: 'weekly',
          dateFrom: new Date('2024-01-01').toISOString(),
          dateTo: new Date('2024-01-07').toISOString(),
        })

        const list = await store.reports.list()
        expect(list.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('search', () => {
      it('searches entries by content', async () => {
        await store.entries.create({ content: 'React component refactoring' })
        await store.entries.create({ content: 'Database migration script' })

        const results = await store.search.search('React')
        expect(results.length).toBeGreaterThanOrEqual(1)
        expect(results.every((e) => e.content.includes('React'))).toBe(true)
      })

      it('returns empty for no matches', async () => {
        const results = await store.search.search('zzz_nonexistent_zzz')
        expect(results).toEqual([])
      })
    })

    if (teardown) {
      afterAll(async () => {
        await teardown()
      })
    }
  })
}
