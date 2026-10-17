export type DevicePlatform = 'macos' | 'windows' | 'linux' | 'web'

export interface Device {
  id: string
  userId: string
  name: string
  platform: DevicePlatform
  appVersion: string | null
  lastSeenAt: string | null
  createdAt: string
  revokedAt: string | null
}

export interface RegisterDeviceInput {
  name: string
  platform: DevicePlatform
  appVersion?: string
}
