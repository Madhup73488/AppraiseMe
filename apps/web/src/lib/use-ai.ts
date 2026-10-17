'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createEnrichEntryUseCase,
  createUpdateEntryUseCase,
} from '@appraiseme/application'
import { rephraseVoiceTranscript } from '@appraiseme/ai-core'
import type { AIProvider, WorklogStore } from '@appraiseme/contracts'
import { buildProvider } from '@/lib/build-provider'
import { createProxyProvider } from '@/lib/proxy-provider'
import type { OutboxStore } from '@appraiseme/sync'
import type {
  AIConnectionConfig,
  AIConnectionHealth,
} from '@appraiseme/ui'

const CONNECTION_KEY = 'appraiseme:ai-connection'

export interface UseAIResult {
  savedConfig: AIConnectionConfig | null
  connected: boolean
  testing: boolean
  health: AIConnectionHealth | null
  enrichingCount: number
  models: string[]
  loadingModels: boolean
  modelsError: string | null
  loadModels: (config: AIConnectionConfig, apiKey: string) => Promise<void>
  testConnection: (config: AIConnectionConfig, apiKey: string) => Promise<void>
  connect: (config: AIConnectionConfig, apiKey: string) => void
  disconnect: () => void
  requestEnrichment: (entryId: string) => void
  providerContext: () => {
    provider: AIProvider
    providerName: string
    modelName: string
  } | null
  /** Speech-to-text via connected provider (null if unsupported) */
  transcribe: ((audio: Blob) => Promise<string>) | null
  /** Rewrites a raw voice transcript into polished task content */
  rephrase: ((text: string) => Promise<string>) | null
}

export interface UseAIOptions {
  /** Supabase access token — enables encrypted server-side persistence */
  authToken?: string | null
}

export function useAI(
  store: WorklogStore,
  outbox: OutboxStore,
  onChanged: () => void,
  options?: UseAIOptions,
): UseAIResult {
  const authToken = options?.authToken ?? null
  const apiKeyRef = useRef<string | null>(null)
  const providerRef = useRef<AIProvider | null>(null)
  const configRef = useRef<AIConnectionConfig | null>(null)
  const enrichRef = useRef<((entryId: string) => Promise<unknown>) | null>(null)
  const queueRef = useRef<Set<string>>(new Set())
  const drainingRef = useRef(false)
  const hooksRef = useRef<{
    connectProxy: (config: AIConnectionConfig, authToken: string) => void
  }>({ connectProxy: () => {} })
  const [savedConfig, setSavedConfig] = useState<AIConnectionConfig | null>(null)
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [health, setHealth] = useState<AIConnectionHealth | null>(null)
  const [enrichingCount, setEnrichingCount] = useState(0)
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONNECTION_KEY)
      if (raw) setSavedConfig(JSON.parse(raw) as AIConnectionConfig)
    } catch {
      // corrupted or unavailable storage — start fresh
    }
  }, [])

  // restore the stored AI connection on load; the API key never reaches the
  // browser — all provider calls go through the /api/ai proxy routes
  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/connections?type=ai', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          connection: {
            config: {
              provider?: string
              baseUrl?: string
              defaultModel?: string
            }
            hasSecret: boolean
          } | null
        }
        if (cancelled || !data.connection || !data.connection.hasSecret) return
        const cfg = data.connection.config
        if (!cfg.provider) return
        hooksRef.current.connectProxy(
          {
            provider: cfg.provider as AIConnectionConfig['provider'],
            baseUrl: cfg.baseUrl ?? '',
            model: cfg.defaultModel ?? '',
          },
          authToken,
        )
      } catch {
        // restore failed — user re-enters AI settings
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authToken])

  const updateUseCase = useMemo(
    () => createUpdateEntryUseCase({ store, outbox }),
    [store, outbox],
  )

  const drain = useCallback(async () => {
    if (drainingRef.current) return
    drainingRef.current = true
    try {
      while (queueRef.current.size > 0 && enrichRef.current) {
        const [entryId] = queueRef.current
        if (entryId === undefined) break
        setEnrichingCount(queueRef.current.size)
        try {
          await updateUseCase(entryId, { aiStatus: 'processing' })
          onChanged()
          await enrichRef.current(entryId)
        } catch {
          // enrichment use case already marked the entry failed
        }
        queueRef.current.delete(entryId)
        onChanged()
      }
    } finally {
      setEnrichingCount(0)
      drainingRef.current = false
    }
  }, [onChanged, updateUseCase])

  const bindProvider = useCallback(
    (provider: AIProvider, config: AIConnectionConfig) => {
      providerRef.current = provider
      configRef.current = config
      enrichRef.current = createEnrichEntryUseCase({
        store,
        provider,
        providerName: config.provider,
        modelName: config.model,
        outbox,
      })
      setConnected(true)
      void (async () => {
        const recent = await store.entries.list({ limit: 100 })
        for (const entry of recent) {
          if (entry.aiStatus === 'processing') {
            queueRef.current.add(entry.id)
          }
        }
        void drain()
      })()
    },
    [store, outbox, drain],
  )

  const connectProxy = useCallback(
    (config: AIConnectionConfig, auth: string) => {
      apiKeyRef.current = null
      try {
        window.localStorage.setItem(CONNECTION_KEY, JSON.stringify(config))
      } catch {
        // storage unavailable — connection is session-only
      }
      setSavedConfig(config)
      setHealth(null)
      bindProvider(createProxyProvider(auth), config)
    },
    [bindProvider],
  )
  hooksRef.current.connectProxy = connectProxy

  const connect = useCallback(
    (config: AIConnectionConfig, apiKey: string) => {
      apiKeyRef.current = apiKey
      configRef.current = config
      try {
        window.localStorage.setItem(CONNECTION_KEY, JSON.stringify(config))
      } catch {
        // storage unavailable — connection is session-only
      }
      setSavedConfig(config)
      setHealth(null)
      void buildProvider(config, apiKey)
        .then(async (localProvider) => {
          let activeProvider: AIProvider = localProvider
          if (authToken) {
            // persist encrypted server-side, then drop the key from the
            // browser and route all calls through the server proxy
            try {
              const res = await fetch('/api/connections', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                  type: 'ai',
                  name: config.provider,
                  config: {
                    provider: config.provider,
                    baseUrl: config.baseUrl ?? '',
                    defaultModel: config.model ?? '',
                  },
                  secret: apiKey,
                }),
              })
              if (res.ok) {
                activeProvider = createProxyProvider(authToken)
                apiKeyRef.current = null
              }
            } catch {
              // persistence is best-effort — local provider works this session
            }
          }
          bindProvider(activeProvider, config)
        })
        .catch((e: unknown) => {
          setHealth({
            healthy: false,
            error: e instanceof Error ? e.message : 'Provider setup failed',
          })
        })
    },
    [bindProvider, authToken],
  )

  const disconnect = useCallback(() => {
    apiKeyRef.current = null
    providerRef.current = null
    configRef.current = null
    enrichRef.current = null
    queueRef.current.clear()
    setEnrichingCount(0)
    setConnected(false)
    setHealth(null)
  }, [])

  const loadModels = useCallback(
    async (config: AIConnectionConfig, apiKey: string) => {
      const base =
        config.baseUrl?.replace(/\/$/, '') ||
        (config.provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : '')
      if (!base) {
        setModels([])
        setModelsError('Enter a base URL first')
        return
      }
      setLoadingModels(true)
      setModelsError(null)
      try {
        const headers = { Authorization: `Bearer ${apiKey}` }
        let res = await fetch(`${base}/models`, { headers })
        if ([404, 405, 501].includes(res.status)) {
          res = await fetch(`${base}/v1/models`, { headers })
        }
        if (!res.ok) {
          const hint =
            res.status === 401 || res.status === 403
              ? ' — check your API key'
              : res.status === 404
                ? ' — check the base URL'
                : ''
          throw new Error(`HTTP ${res.status}${hint}`)
        }
        const data = (await res.json()) as { data?: Array<{ id?: string }> }
        const list = (data.data ?? [])
          .map((m) => m.id)
          .filter((id): id is string => typeof id === 'string')
        if (list.length === 0) throw new Error('Endpoint returned no models')
        setModels(list)
      } catch (e) {
        setModels([])
        setModelsError(
          e instanceof Error
            ? `Couldn't load models: ${e.message}`
            : "Couldn't load models",
        )
      } finally {
        setLoadingModels(false)
      }
    },
    [],
  )

  const testConnection = useCallback(
    async (config: AIConnectionConfig, apiKey: string) => {
      setTesting(true)
      setHealth(null)
      try {
        const provider = await buildProvider(config, apiKey)
        const result = await provider.testConnection()
        setHealth(result)
      } catch (e) {
        setHealth({
          healthy: false,
          error: e instanceof Error ? e.message : 'Connection failed',
        })
      } finally {
        setTesting(false)
      }
    },
    [],
  )

  const providerContext = useCallback(() => {
    if (!providerRef.current || !configRef.current) return null
    return {
      provider: providerRef.current,
      providerName: configRef.current.provider,
      modelName: configRef.current.model,
    }
  }, [])

  const requestEnrichment = useCallback(
    (entryId: string) => {
      if (!enrichRef.current) return
      queueRef.current.add(entryId)
      void drain()
    },
    [drain],
  )

  const transcribe = useCallback((audio: Blob) => {
    const provider = providerRef.current
    if (!provider?.transcribeAudio) {
      return Promise.reject(new Error('Provider does not support audio transcription'))
    }
    return provider.transcribeAudio(audio)
  }, [])

  const rephrase = useCallback((text: string) => {
    const provider = providerRef.current
    if (!provider) {
      return Promise.reject(new Error('AI provider not connected'))
    }
    return rephraseVoiceTranscript(text, provider)
  }, [])

  return {
    savedConfig,
    connected,
    testing,
    health,
    enrichingCount,
    models,
    loadingModels,
    modelsError,
    loadModels,
    testConnection,
    connect,
    disconnect,
    requestEnrichment,
    transcribe,
    rephrase,
    providerContext,
  }
}
