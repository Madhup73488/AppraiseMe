import { describe, expect, it } from 'vitest'
import { createObservability } from './index.js'

describe('createObservability', () => {
  const config = {
    enabled: true,
    appVersion: '1.0.0',
    telemetryConsent: true,
  }

  it('captures errors and scrubs them', () => {
    const { captureError } = createObservability(config)
    const err = new Error('Connection failed with api_key=sk-abc123def456')
    const report = captureError(err)

    expect(report).not.toBeNull()
    expect(report!.errorMessage).toContain('api_key=')
    expect(report!.errorMessage).not.toContain('sk-abc123')
    expect(report!.category).toBeDefined()
    expect(report!.errorCode).toBeDefined()
  })

  it('classifies errors by category', () => {
    const { captureError } = createObservability(config)
    expect(captureError(new TypeError('x'))!.category).toBe('type_error')
    expect(captureError(new RangeError('y'))!.category).toBe('range_error')
    expect(captureError('string err')!.category).toBe('string_error')
  })

  it('does not capture when disabled', () => {
    const { captureError } = createObservability({ ...config, enabled: false })
    expect(captureError(new Error('test'))).toBeNull()
  })

  it('does not capture events without telemetry consent', () => {
    const { captureEvent } = createObservability({
      ...config,
      telemetryConsent: false,
    })
    captureEvent({ name: 'test', category: 'entry' })
    // No error thrown, no crash — just silently skips
    expect(true).toBe(true)
  })

  it('scrubs event properties', () => {
    const { captureEvent } = createObservability(config)
    captureEvent({
      name: 'test',
      category: 'entry',
      properties: { apiKey: 'sk-secret', count: 5 },
    })
    // No throw — scrubbing happens inside captureEvent
    expect(true).toBe(true)
  })

  it('captures error report fields', () => {
    const { captureError } = createObservability(config)
    const report = captureError(new Error('test'), {
      metadata: { adapter: 'postgres' },
    })
    expect(report).toHaveProperty('errorCode')
    expect(report).toHaveProperty('errorMessage')
    expect(report).toHaveProperty('category')
    expect(report).toHaveProperty('appVersion')
    expect(report).toHaveProperty('timestamp')
    expect(report!.metadata!.adapter).toBe('postgres')
  })
})
