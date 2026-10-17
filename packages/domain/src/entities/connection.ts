import type { CredentialMode } from './credential.js'

export type DataProvider = 'supabase' | 'neon' | 'postgres' | 'turso'

export type DataEngine = 'postgres' | 'sqlite' | 'libsql'

export type ConnectionStatus =
  'unverified' | 'connected' | 'error' | 'migrating'

export interface DataConnection {
  id: string
  accountId: string
  createdBy: string
  name: string
  provider: DataProvider
  engine: DataEngine
  credentialId: string | null
  credentialMode: CredentialMode
  nonSecretConfig: Record<string, string>
  schemaVersion: number | null
  status: ConnectionStatus
  lastVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AIProviderName =
  'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'compatible'

export interface AIConnection {
  id: string
  accountId: string
  createdBy: string
  name: string
  provider: AIProviderName
  credentialId: string | null
  credentialMode: CredentialMode
  baseUrl: string | null
  defaultModel: string | null
  enrichmentModel: string | null
  reportModel: string | null
  embeddingModel: string | null
  enabled: boolean
  lastVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}
