import type { DataProvider, DataEngine } from '@appraiseme/domain'

export interface NormalizedConnection {
  engine: DataEngine
  connectionString?: string
  authToken?: string
  url?: string
}

export interface ConnectionConfig {
  provider: DataProvider
  nonSecretConfig: Record<string, string>
  secretConfig?: Record<string, string>
}

export function normalizeConnection(
  config: ConnectionConfig,
): NormalizedConnection {
  switch (config.provider) {
    case 'supabase':
      return normalizeSupabase(config)
    case 'neon':
      return normalizeNeon(config)
    case 'postgres':
      return normalizePostgres(config)
    case 'turso':
      return normalizeTurso(config)
    default:
      throw new Error(`Unsupported provider: ${config.provider as string}`)
  }
}

function normalizeSupabase(config: ConnectionConfig): NormalizedConnection {
  const { nonSecretConfig, secretConfig } = config
  const connectionString =
    nonSecretConfig.connectionString ||
    secretConfig?.connectionString ||
    nonSecretConfig.dbUrl ||
    secretConfig?.dbUrl

  if (!connectionString) {
    const projectRef = nonSecretConfig.projectRef
    const dbPassword = secretConfig?.dbPassword
    if (projectRef && dbPassword) {
      return {
        engine: 'postgres',
        connectionString: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${nonSecretConfig.region || 'us-east-1'}.pooler.supabase.com:6543/postgres`,
      }
    }
    throw new Error(
      'Supabase connection requires connectionString or projectRef + dbPassword',
    )
  }

  return { engine: 'postgres', connectionString }
}

function normalizeNeon(config: ConnectionConfig): NormalizedConnection {
  const { nonSecretConfig, secretConfig } = config
  const connectionString =
    nonSecretConfig.connectionString || secretConfig?.connectionString

  if (!connectionString) {
    const host = nonSecretConfig.host
    const database = nonSecretConfig.database || 'neondb'
    const user = nonSecretConfig.user || nonSecretConfig.role
    const password = secretConfig?.password

    if (host && user && password) {
      return {
        engine: 'postgres',
        connectionString: `postgresql://${user}:${password}@${host}/${database}?sslmode=require`,
      }
    }
    throw new Error(
      'Neon connection requires connectionString or host + user + password',
    )
  }

  return { engine: 'postgres', connectionString }
}

function normalizePostgres(config: ConnectionConfig): NormalizedConnection {
  const { nonSecretConfig, secretConfig } = config
  const connectionString =
    nonSecretConfig.connectionString || secretConfig?.connectionString

  if (!connectionString) {
    const host = nonSecretConfig.host || 'localhost'
    const port = nonSecretConfig.port || '5432'
    const database = nonSecretConfig.database || 'postgres'
    const user = nonSecretConfig.user || 'postgres'
    const password = secretConfig?.password

    return {
      engine: 'postgres',
      connectionString: `postgresql://${user}:${password ? `${password}@` : ''}${host}:${port}/${database}`,
    }
  }

  return { engine: 'postgres', connectionString }
}

function normalizeTurso(config: ConnectionConfig): NormalizedConnection {
  const { nonSecretConfig, secretConfig } = config
  const url = nonSecretConfig.url || nonSecretConfig.libsqlUrl

  if (!url) {
    throw new Error('Turso connection requires url')
  }

  const authToken = secretConfig?.authToken || secretConfig?.token

  if (!authToken) {
    throw new Error('Turso connection requires authToken')
  }

  return { engine: 'libsql', url, authToken }
}
