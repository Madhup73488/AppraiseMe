import { createTursoStore } from '@appraiseme/storage-turso'

const URL = 'http://127.0.0.1:8080'

// app 1 writes
const app1 = createTursoStore({ url: URL, authToken: '', ownerId: 'smoke-user' })
const created = await app1.store.entries.create({ content: 'hello shared db' })
console.log('app1 created:', created.id, '| aiStatus:', created.aiStatus)

await app1.store.entries.update(created.id, {
  content: 'hello shared db v2',
  aiStatus: 'completed',
  aiSummary: 'smoke summary',
})
await app1.close()

// app 2 reads (fresh connection = same as the other app)
const app2 = createTursoStore({ url: URL, authToken: '', ownerId: 'smoke-user' })
const list = await app2.store.entries.list({ limit: 10 })
console.log('app2 sees', list.length, 'entry:', list[0]?.content, '| aiStatus:', list[0]?.aiStatus)

// upsert path (used by sync engine)
const upserted = await app2.store.entries.upsert({
  ...list[0],
  content: 'hello shared db v3 (synced)',
})
console.log('app2 upsert version:', upserted.version)
await app2.close()

if (list.length !== 1 || list[0].aiStatus !== 'completed') {
  throw new Error('SMOKE FAILED')
}
console.log('\nSHARED LIBSQL SMOKE PASSED')
