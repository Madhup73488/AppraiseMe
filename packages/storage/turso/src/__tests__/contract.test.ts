import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTursoStore } from '../index.js'
import { runWorklogStoreContractTests } from '@appraiseme/test-utils'

/**
 * Contract tests for the Turso/libSQL adapter.
 *
 * By default these run against a temporary local libSQL file so no remote
 * database is required. Set TEST_TURSO_URL (and optionally TEST_TURSO_TOKEN)
 * to run against a real Turso database instead:
 *
 *   TEST_TURSO_URL=libsql://your-db.turso.io TEST_TURSO_TOKEN=... vitest run
 */

const remoteUrl = process.env.TEST_TURSO_URL
const dbPath = join(tmpdir(), `appraiseme-turso-test-${Date.now()}.db`)

const handle = createTursoStore({
  url: remoteUrl || `file:${dbPath}`,
  authToken: process.env.TEST_TURSO_TOKEN || '',
  ownerId: 'test-owner',
})

runWorklogStoreContractTests(
  'Turso',
  async () => handle.store,
  async () => {
    await handle.close()
    if (!remoteUrl) {
      try {
        rmSync(dbPath)
        rmSync(dbPath + '-wal')
        rmSync(dbPath + '-shm')
      } catch {
        // ignore
      }
    }
  },
)
