import { hashId } from '@appraiseme/observability'

export interface SystemInfo {
  platform: string
  platformVersion: string
  arch: string
  appVersion: string
  electronVersion?: string
  nodeVersion?: string
  memoryMb?: number
  uptimeSeconds: number
}

export interface SupportBundle {
  version: 1
  generatedAt: string
  systemInfo: SystemInfo
  recentErrors: string[]
  schemaVersion?: string
  adapterType?: string
  syncState?: string
  storageAdapter?: string
  aiProvider?: string
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  platform: string
  registeredAt: string
}

export function collectSystemInfo(): SystemInfo {
  const info: SystemInfo = {
    platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    platformVersion:
      typeof process !== 'undefined' ? process.version : 'unknown',
    arch: typeof process !== 'undefined' ? process.arch : 'unknown',
    appVersion: getAppVersion(),
    electronVersion: getElectronVersion(),
    nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
    memoryMb: getMemoryUsage(),
    uptimeSeconds: getUptime(),
  }
  return info
}

function getAppVersion(): string {
  try {
    if (typeof process !== 'undefined' && process.env.npm_package_version) {
      return process.env.npm_package_version
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function getElectronVersion(): string | undefined {
  try {
    if (typeof process === 'undefined') return undefined
    const v = (process as { versions?: { electron?: string } }).versions
    return v?.electron
  } catch {
    return undefined
  }
}

function getMemoryUsage(): number | undefined {
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
  } catch {
    return undefined
  }
  return undefined
}

function getUptime(): number {
  try {
    if (typeof process !== 'undefined' && process.uptime) {
      return Math.round(process.uptime())
    }
  } catch {
    return 0
  }
  return 0
}

export function generateSupportBundle(
  systemInfo: SystemInfo,
  errors: Array<{ errorCode: string; timestamp: string }>,
  extras?: {
    schemaVersion?: string
    adapterType?: string
    syncState?: string
    storageAdapter?: string
    aiProvider?: string
  },
): SupportBundle {
  const safeErrors = errors
    .map((e) => `${e.errorCode} @ ${e.timestamp}`)
    .slice(0, 50)

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    systemInfo,
    recentErrors: safeErrors,
    ...(extras?.schemaVersion ? { schemaVersion: extras.schemaVersion } : {}),
    ...(extras?.adapterType ? { adapterType: hashId(extras.adapterType) } : {}),
    ...(extras?.syncState ? { syncState: extras.syncState } : {}),
    ...(extras?.storageAdapter
      ? { storageAdapter: extras.storageAdapter }
      : {}),
    ...(extras?.aiProvider ? { aiProvider: extras.aiProvider } : {}),
  }
}

export function exportSupportBundleJson(bundle: SupportBundle): string {
  return JSON.stringify(bundle, null, 2)
}

export function downloadSupportBundle(bundle: SupportBundle): void {
  const json = exportSupportBundleJson(bundle)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `appraiseme-support-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
