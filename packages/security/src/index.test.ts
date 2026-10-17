import { describe, it, expect } from 'vitest'
import { redactSecrets, isLikelySecret } from './credential.js'
import { redactUrl, truncateForDisplay } from './redact.js'

describe('redactSecrets', () => {
  it('redacts OpenAI-style keys', () => {
    const input = 'using key sk-abcdefghijklmnopqrstuvwxyz123456 for openai'
    expect(redactSecrets(input)).toBe('using key [REDACTED] for openai')
  })

  it('redacts Anthropic-style keys', () => {
    const input = 'key sk-ant-abcdefghijklmnopqrstuvwxyz123456'
    expect(redactSecrets(input)).toBe('key [REDACTED]')
  })

  it('redacts Google API keys', () => {
    const input = 'AIza' + 'a'.repeat(35)
    expect(redactSecrets(`token ${input}`)).toBe('token [REDACTED]')
  })

  it('redacts postgres connection strings with credentials', () => {
    const input = 'postgres://user:secret@db.example.com:5432/worklog'
    expect(redactSecrets(input)).toBe('[REDACTED]')
  })

  it('redacts bearer tokens', () => {
    expect(redactSecrets('Authorization: Bearer abc123def456.ghi-789')).toBe(
      'Authorization: [REDACTED]',
    )
  })

  it('leaves ordinary text untouched', () => {
    const input = 'Fixed the login page bug and shipped the release'
    expect(redactSecrets(input)).toBe(input)
  })
})

describe('isLikelySecret', () => {
  it('detects secrets', () => {
    expect(isLikelySecret('sk-abcdefghijklmnopqrstuvwxyz123456')).toBe(true)
    expect(isLikelySecret('postgres://user:pass@host:5432/db')).toBe(true)
  })

  it('does not flag ordinary strings', () => {
    expect(isLikelySecret('hello world')).toBe(false)
    expect(isLikelySecret('short')).toBe(false)
  })
})

describe('redactUrl', () => {
  it('redacts credentials in URLs', () => {
    expect(
      redactUrl('postgres://user:secret@db.example.com:5432/worklog'),
    ).toBe('postgres://[REDACTED]:[REDACTED]@db.example.com:5432/worklog')
  })

  it('keeps URLs without credentials intact', () => {
    expect(redactUrl('https://api.example.com/v1/chat')).toBe(
      'https://api.example.com/v1/chat',
    )
  })

  it('returns placeholder for invalid URLs', () => {
    expect(redactUrl('not a url')).toBe('[INVALID_URL]')
  })
})

describe('truncateForDisplay', () => {
  it('returns short values unchanged', () => {
    expect(truncateForDisplay('short')).toBe('short')
  })

  it('masks the middle of long values', () => {
    const result = truncateForDisplay('abcdefghijklmnop')
    expect(result.startsWith('abcd')).toBe(true)
    expect(result.endsWith('mnop')).toBe(true)
    expect(result).toContain('••••')
  })

  it('respects custom max length', () => {
    expect(truncateForDisplay('exactly12', 12)).toBe('exactly12')
  })
})
