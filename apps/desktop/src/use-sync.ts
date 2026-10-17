import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createSyncManager,
  type SyncManagerState,
} from '@appraiseme/application'
import { createLocalOutbox, type OutboxStore } from '@appraiseme/sync'
import { createTursoStore } from '@appraiseme/storage-turso'
import { createSupabaseStore } from '@appraiseme/storage-supabase'
import { createBackfillToRemoteUseCase } from '@appraiseme/application'
import type { WorklogStore } from '@appraiseme/contracts'
import type { SyncState } from '@appraiseme/ui'

const CONNECTION_URL_KEY = 'appraiseme:db-connection:url'
const CONNECTION_TYPE_KEY = 'appraiseme:db-connection:type'

export type DataConnectionType = 'turso' | 'supabase'

export interface UseSyncResult {
  outbox: OutboxStore
  syncState: SyncState
  savedUrl: string | null
  connected: boolean
  connecting: boolean
  error: string | null
  pendingCount: number
  connect: (url: string, token?: string, type?: DataConnectionType) => void
  disconnect: () => void
  syncNow: () => void
  savedType: DataConnectionType
  backfilling: boolean
  backfillResult: string | null
  backfillError: string | null
  backfill: () => Promise<void>
}

export function useSync(store: WorklogStore, ownerId: string): UseSyncResult {
  const outbox = useMemo(() => createLocalOutbox(), [])
  const urlRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const typeRef = useRef<DataConnectionType>('turso')
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [savedType, setSavedType] =
    useState<DataConnectionType>('turso')
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  const manager = useMemo(
    () =>
      createSyncManager({
        localStore: store,
        outbox,
        createRemoteStore: async () => {
          const url = urlRef.current
          const token = tokenRef.current
          if (!url) {
            throw new Error('No database connection configured')
          }
          if (typeRef.current === 'supabase') {
            const handle = createSupabaseStore({ url, apiKey: token || '', ownerId })
            const probe = await handle.verifySetup()
            if (!probe.ready) {
              throw new Error(probe.error ?? 'Supabase setup missing')
            }
            return handle
          }
          return createTursoStore({
            url,
            authToken: token || '',
            ownerId,
          })
        },
      }),
    [store, outbox, ownerId],
  )

  const [managerState, setManagerState] = useState<SyncManagerState>(() =>
    manager.getState(),
  )

  useEffect(() => manager.subscribe(setManagerState), [manager])

  useEffect(() => {
    return () => {
      manager.dispose()
    }
  }, [manager])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    try {
      setSavedUrl(window.localStorage.getItem(CONNECTION_URL_KEY))
      const t = window.localStorage.getItem(CONNECTION_TYPE_KEY)
      if (t === 'turso' || t === 'supabase') {
        typeRef.current = t
        setSavedType(t)
      }
    } catch {
      // storage unavailable — local-only mode
    }
  }, [])

  const connect = useCallback(
    (url: string, token?: string, type: DataConnectionType = 'turso') => {
      urlRef.current = url
      tokenRef.current = token ?? null
      typeRef.current = type
      try {
        window.localStorage.setItem(CONNECTION_URL_KEY, url)
        window.localStorage.setItem(CONNECTION_TYPE_KEY, type)
      } catch {
        // storage unavailable — connection is session-only
      }
      setSavedUrl(url)
      setSavedType(type)
      void manager.connect()
    },
    [manager],
  )

  const backfill = useCallback(async () => {
    const url = urlRef.current
    if (!url) return
    setBackfilling(true)
    setBackfillResult(null)
    setBackfillError(null)
    try {
      const remote =
        typeRef.current === 'supabase'
          ? createSupabaseStore({
              url,
              apiKey: tokenRef.current || '',
              ownerId,
            }).store
          : createTursoStore({
              url,
              authToken: tokenRef.current || '',
              ownerId,
            }).store
      const run = createBackfillToRemoteUseCase({ localStore: store })
      const result = await run(remote)
      setBackfillResult(
        `Copied ${result.entries} entries, ${result.projects} projects, ` +
          `${result.reports} reports, ${result.tags} tags`,
      )
    } catch (e) {
      setBackfillError(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }, [store, ownerId])

  const disconnect = useCallback(() => {
    tokenRef.current = null
    void manager.disconnect()
  }, [manager])

  const syncNow = useCallback(() => {
    void manager.syncNow()
  }, [manager])

  const syncState = useMemo<SyncState>(() => {
    if (!online) return { status: 'offline' }
    switch (managerState.status) {
      case 'connecting':
        return { status: 'syncing' }
      case 'error':
        return {
          status: 'failed',
          message: managerState.error ?? 'Sync failed',
        }
      case 'connected':
        if (managerState.deadLetter > 0) {
          return {
            status: 'failed',
            message: `${managerState.deadLetter} changes failed to sync permanently`,
          }
        }
        if (managerState.pending > 0) return { status: 'syncing' }
        return { status: 'synced' }
      default:
        return { status: 'idle' }
    }
  }, [managerState, online])

  return {
    outbox,
    syncState,
    savedUrl,
    savedType,
    connected: managerState.status === 'connected',
    connecting: managerState.status === 'connecting',
    error: managerState.error,
    pendingCount: managerState.pending,
    connect,
    disconnect,
    syncNow,
    backfilling,
    backfillResult,
    backfillError,
    backfill,
  }
}
