import { describe } from 'vitest'
import { createPostgresStore } from '../index.js'
import { runWorklogStoreContractTests } from '@appraiseme/test-utils'

/**
 * Contract tests for the PostgreSQL adapter.
 *
 * These tests require a live PostgreSQL database and are skipped unless
 * TEST_POSTGRES_URL is set. Point it at a disposable database — the adapter
 * runs its migrations on connect. Example:
 *
 *   TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/worklog_test
 */

const connectionString = process.env.TEST_POSTGRES_URL
const maybeDescribe = connectionString ? describe : describe.skip

maybeDescribe('PostgreSQL adapter', () => {
  const handle = createPostgresStore({
    connectionString: connectionString!,
    ownerId: 'test-owner',
  })

  runWorklogStoreContractTests(
    'PostgreSQL',
    async () => handle.store,
    async () => {
      await handle.close()
    },
  )
})
