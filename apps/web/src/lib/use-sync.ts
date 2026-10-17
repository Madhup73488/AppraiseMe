'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createSyncManager,
  createBackfillToRemoteUseCase,
  type SyncManagerState,
} from '@appraiseme/application'
import { createLocalOutbox, type OutboxStore } from '@appraiseme/sync'
import { createTursoWebStore } from '@appraiseme/storage-turso/web'
import { createSupabaseStore } from '@appraiseme/storage-supabase'
import type { WorklogStore } from '@appraiseme/contracts'
import type { SyncState } from '@appraiseme/ui'

const CONNECTION_URL_KEY = 'appraiseme:db-connection:url'
const CONNECTION_TYPE_KEY = 'appraiseme:db-connection:type'

export type DataConnectionType = 'turso' | 'supabase'

export interface UseSyncOptions {
  /** Supabase access token — enables encrypted server-side persistence */
  authToken?: string | null
}

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
  restoring: boolean
  /** true once the encrypted-connection restore attempt has completed */
  restoreFinished: boolean
  backfilling: boolean
  backfillResult: string | null
  backfillError: string | null
  backfill: () => Promise<void>
}

interface SavedConnection {
  connection: {
    config: Record<string, string>
    secret: string | null
  } | null
}

export function useSync(
  store: WorklogStore,
  ownerId: string,
  options?: UseSyncOptions,
): UseSyncResult {
  const outbox = useMemo(() => createLocalOutbox(), [])
  const urlRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const typeRef = useRef<DataConnectionType>('turso')
  const authTokenRef = useRef<string | null>(null)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [savedType, setSavedType] = useState<DataConnectionType>('turso')
  const [restoring, setRestoring] = useState(false)
  const [restoreFinished, setRestoreFinished] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  authTokenRef.current = options?.authToken ?? null

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
          return createTursoWebStore({
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

      // best-effort encrypted persistence for signed-in users
      const auth = authTokenRef.current
      if (auth && token) {
        void fetch('/api/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth}`,
          },
          body: JSON.stringify({
            type: 'data',
            name: 'My Supabase',
            config: { url, engine: type },
            secret: token,
          }),
        }).catch(() => {
          // persistence is best-effort; sync itself still works this session
        })
      }
    },
    [manager],
  )

  // restore encrypted connection on load (signed-in users)
  useEffect(() => {
    const auth = authTokenRef.current
    if (!auth) {
      setRestoreFinished(false)
      return
    }
    let cancelled = false
    setRestoring(true)
    void (async () => {
      try {
        const res = await fetch('/api/connections?type=data', {
          headers: { Authorization: `Bearer ${auth}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as SavedConnection
        if (cancelled || !data.connection) return
        const url = data.connection.config['url']
        if (!url) return
        connect(url, data.connection.secret ?? '', 'supabase')
      } catch {
        // restore failed — user will re-enter connection
      } finally {
        if (!cancelled) {
          setRestoring(false)
          setRestoreFinished(true)
        }
      }
    })()
    return () => {
      cancelled = true
      setRestoring(false)
    }
  }, [options?.authToken])

  const disconnect = useCallback(() => {
    tokenRef.current = null
    void manager.disconnect()
    const auth = authTokenRef.current
    if (auth) {
      void fetch('/api/connections?type=data', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth}` },
      }).catch(() => {
        // best-effort
      })
    }
  }, [manager])

  const syncNow = useCallback(() => {
    void manager.syncNow()
  }, [manager])

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
          : createTursoWebStore({
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
    restoring,
    restoreFinished,
    backfilling,
    backfillResult,
    backfillError,
    backfill,
  }
}
