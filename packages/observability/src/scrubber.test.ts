import { describe, expect, it } from 'vitest'
import { hashId, scrubString, scrubValue } from './scrubber.js'

describe('scrubString', () => {
  it('redacts API keys', () => {
    expect(scrubString('api_key = "sk-abc123def456ghij789"')).toContain(
      '[REDACTED]',
    )
    expect(scrubString('api_key = "sk-abc123def456ghij789"')).not.toContain(
      'sk-abc123',
    )
  })

  it('redacts database connection strings', () => {
    expect(scrubString('db = "postgres://user:pass@host:5432/db"')).toContain(
      '[REDACTED]',
    )
    expect(scrubString('url = "mysql://user:pass@host/db"')).toContain(
      '[REDACTED]',
    )
  })

  it('redacts bearer tokens', () => {
    expect(
      scrubString(
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def',
      ),
    ).toContain('[REDACTED]')
  })

  it('redacts emails', () => {
    expect(scrubString('user@example.com logged in')).toContain('[EMAIL]')
    expect(scrubString('user@example.com logged in')).not.toContain(
      'user@example.com',
    )
  })

  it('redacts UUIDs', () => {
    expect(scrubString('id: 550e8400-e29b-41d4-a716-446655440000')).toContain(
      '[UUID]',
    )
  })

  it('redacts connection strings with embedded credentials', () => {
    const s =
      'connection_string = "postgres://u:p@host:5432/db?sslmode=require"'
    const result = scrubString(s)
    expect(result).toContain('[REDACTED]')
    expect(result).not.toContain('u:p@')
  })

  it('scrubs sensitive parameter values', () => {
    expect(scrubString('password = "secret123"')).toContain('[REDACTED]')
    expect(scrubString('token = "abc123"')).toContain('[REDACTED]')
    expect(scrubString('dsn = "postgres://u:p@host/db"')).toContain(
      '[REDACTED]',
    )
  })

  it('leaves safe strings intact', () => {
    expect(
      scrubString('report generation succeeded', { allowErrorMessage: true }),
    ).toBe('report generation succeeded')
    expect(scrubString('adapter = postgres', { allowErrorMessage: true })).toBe(
      'adapter = postgres',
    )
  })

  it('truncates long strings', () => {
    const long = 'a'.repeat(300)
    expect(scrubString(long).length).toBeLessThanOrEqual(200)
  })
})

describe('scrubValue', () => {
  it('recursively scrubs objects', () => {
    const result = scrubValue({
      apiKey: 'sk-abcdef123456abcdef123456',
      user: { password: 'hunter2', email: 'user@test.com' },
      count: 42,
    })
    const r = result as Record<string, unknown>
    expect(r.apiKey as string).toContain('[REDACTED]')
    expect((r.user as Record<string, unknown>).email as string).not.toContain(
      'user@test.com',
    )
    expect(r.count).toBe(42)
  })

  it('scrubs arrays', () => {
    const result = scrubValue([
      'sk-abcdef123456abcdef123456',
      'safe',
    ]) as string[]
    expect(result[0]).toContain('[REDACTED]')
    expect(result[1]).toBe('safe')
  })

  it('returns primitives unchanged', () => {
    expect(scrubValue(42)).toBe(42)
    expect(scrubValue(true)).toBe(true)
    expect(scrubValue(null)).toBe(null)
  })
})

describe('hashId', () => {
  it('produces deterministic output', () => {
    expect(hashId('abc')).toBe(hashId('abc'))
    expect(hashId('abc')).not.toBe(hashId('xyz'))
  })

  it('produces short hashes', () => {
    expect(hashId('550e8400-e29b-41d4-a716-446655440000')).toMatch(
      /^h_[a-z0-9]+$/,
    )
  })
})
