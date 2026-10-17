import { createClient } from '@libsql/client/web'
import {
  createTursoStoreFromClient,
  type TursoStoreHandle,
} from './store-factory.js'

export interface CreateTursoWebStoreOptions {
  url: string
  authToken: string
  ownerId: string
}

export function createTursoWebStore(
  opts: CreateTursoWebStoreOptions,
): TursoStoreHandle {
  const client = createClient({
    url: opts.url,
    authToken: opts.authToken,
  })
  return createTursoStoreFromClient(client, opts.ownerId)
}
