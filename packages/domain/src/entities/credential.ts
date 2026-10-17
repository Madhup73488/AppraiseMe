export type CredentialKind = 'database' | 'ai'

export type CredentialMode = 'cloud_encrypted' | 'device_only'

export interface CredentialMetadata {
  id: string
  accountId: string
  kind: CredentialKind
  encryptionKeyVersion: string
  encryptionContext: Record<string, string>
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
}
