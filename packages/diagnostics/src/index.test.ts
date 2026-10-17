import { describe, expect, it } from 'vitest'
import {
  collectSystemInfo,
  generateSupportBundle,
  exportSupportBundleJson,
  type SystemInfo,
} from './index.js'

describe('collectSystemInfo', () => {
  it('returns system info', () => {
    const info = collectSystemInfo()
    expect(info).toHaveProperty('platform')
    expect(info).toHaveProperty('appVersion')
    expect(info).toHaveProperty('uptimeSeconds')
  })
})

describe('generateSupportBundle', () => {
  const mockInfo: SystemInfo = {
    platform: 'darwin',
    platformVersion: '24.0.0',
    arch: 'arm64',
    appVersion: '1.0.0',
    nodeVersion: '22.0.0',
    memoryMb: 100,
    uptimeSeconds: 3600,
  }

  it('generates a valid support bundle', () => {
    const bundle = generateSupportBundle(mockInfo, [
      { errorCode: 'SYNC_FAILED', timestamp: '2025-01-01T00:00:00Z' },
      { errorCode: 'AUTH_ERROR', timestamp: '2025-01-01T01:00:00Z' },
    ])

    expect(bundle.version).toBe(1)
    expect(bundle.systemInfo.platform).toBe('darwin')
    expect(bundle.recentErrors).toHaveLength(2)
    expect(bundle.recentErrors[0]).toContain('SYNC_FAILED')
    expect(bundle.generatedAt).toBeDefined()
  })

  it('limits errors to 50', () => {
    const errors = Array.from({ length: 100 }, (_, i) => ({
      errorCode: `ERR_${i}`,
      timestamp: '2025-01-01T00:00:00Z',
    }))
    const bundle = generateSupportBundle(mockInfo, errors)
    expect(bundle.recentErrors.length).toBeLessThanOrEqual(50)
  })

  it('includes extras when provided', () => {
    const bundle = generateSupportBundle(mockInfo, [], {
      schemaVersion: '42',
      adapterType: 'postgres',
      syncState: 'synced',
    })
    expect(bundle.schemaVersion).toBe('42')
    expect(bundle.syncState).toBe('synced')
  })

  it('omits extras not provided', () => {
    const bundle = generateSupportBundle(mockInfo, [])
    expect(bundle).not.toHaveProperty('schemaVersion')
    expect(bundle).not.toHaveProperty('syncState')
  })
})

describe('exportSupportBundleJson', () => {
  it('exports valid JSON', () => {
    const bundle = generateSupportBundle(collectSystemInfo(), [])
    const json = exportSupportBundleJson(bundle)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed).toHaveProperty('systemInfo')
    expect(parsed).toHaveProperty('recentErrors')
  })

  it('includes error codes not raw error messages', () => {
    const bundle = generateSupportBundle(
      {
        platform: 'darwin',
        platformVersion: '24',
        arch: 'arm64',
        appVersion: '1.0.0',
        memoryMb: 100,
        uptimeSeconds: 60,
      },
      [{ errorCode: 'SYNC_CONFLICT', timestamp: '2025-01-01T00:00:00Z' }],
    )
    const json = exportSupportBundleJson(bundle)
    expect(json).toContain('SYNC_CONFLICT')
    expect(json).not.toContain('sk-abcdef')
    expect(json).not.toContain('user@example.com')
  })
})
