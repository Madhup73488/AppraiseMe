import crypto from 'node:crypto'

export const KEY_VERSION = 'v1'

function masterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be set to a 32-byte hex string (64 hex chars)',
    )
  }
  return Buffer.from(hex, 'hex')
}

export interface EncryptedPayload {
  /** PostgREST bytea format: "\\x" + hex */
  payload: string
  keyVersion: string
  context: Record<string, string>
}

export function encryptSecret(plain: string): EncryptedPayload {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  // iv (12) + tag (16) + ciphertext — all fixed-order, hex-encoded
  const blob = Buffer.concat([iv, tag, ciphertext])
  return {
    payload: '\\x' + blob.toString('hex'),
    keyVersion: KEY_VERSION,
    context: { alg: 'aes-256-gcm' },
  }
}

export function decryptSecret(encrypted: EncryptedPayload): string {
  if (encrypted.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported encryption key version: ${encrypted.keyVersion}`)
  }
  if (!encrypted.payload.startsWith('\\x')) {
    throw new Error('Malformed encrypted payload')
  }
  const blob = Buffer.from(encrypted.payload.slice(2), 'hex')
  if (blob.length < 12 + 16) {
    throw new Error('Encrypted payload too short')
  }
  const iv = blob.subarray(0, 12)
  const tag = blob.subarray(12, 28)
  const ciphertext = blob.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}
