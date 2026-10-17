import { runWorklogStoreContractTests } from '@appraiseme/test-utils'
import { createMemoryStore } from '../index.js'

runWorklogStoreContractTests('In-memory', async () =>
  createMemoryStore('test-owner'),
)
