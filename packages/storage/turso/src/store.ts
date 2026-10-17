import { createClient } from '@libsql/client'
import {
  createTursoStoreFromClient,
  type TursoStoreHandle,
} from './store-factory.js'

export interface CreateTursoStoreOptions {
  url: string
  authToken: string
  ownerId: string
}

export function createTursoStore(
  opts: CreateTursoStoreOptions,
): TursoStoreHandle {
  const client = createClient({
    url: opts.url,
    authToken: opts.authToken,
  })
  return createTursoStoreFromClient(client, opts.ownerId)
}

export type { TursoStoreHandle }
