import type { CredentialKind } from '@appraiseme/domain'

export interface EncryptedCredential {
  ciphertext: Uint8Array
  keyVersion: string
  context: Record<string, string>
}

export interface CredentialService {
  encrypt(
    plaintext: string,
    kind: CredentialKind,
    accountId: string,
  ): Promise<EncryptedCredential>
  decrypt(encrypted: EncryptedCredential): Promise<string>
  rotateKeyVersion(newVersion: string): Promise<void>
}

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-ant-[a-zA-Z0-9-_]{20,}/g,
  /AIza[a-zA-Z0-9_-]{35}/g,
  /postgres:\/\/[^\s]+:[^\s]+@[^\s]+/g,
  /postgresql:\/\/[^\s]+:[^\s]+@[^\s]+/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /[a-zA-Z0-9_-]{32,}@|[a-zA-Z0-9_-]{20,}:[a-zA-Z0-9_-]{20,}/g,
]

export function redactSecrets(input: string): string {
  let result = input
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

export function isLikelySecret(input: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(input))
}
