import { createSqliteStore } from '../index.js'
import { runWorklogStoreContractTests } from '@appraiseme/test-utils'
import { unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const dbPath = join(tmpdir(), `appraiseme-test-${Date.now()}.db`)

const handle = createSqliteStore({
  dbPath,
  ownerId: 'test-owner',
})

runWorklogStoreContractTests(
  'SQLite',
  async () => handle.store,
  async () => {
    handle.close()
    try {
      unlinkSync(dbPath)
    } catch {
      // ignore
    }
  },
)
