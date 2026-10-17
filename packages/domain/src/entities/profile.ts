export interface Profile {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  timezone: string
  locale: string
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileInput {
  displayName?: string
  avatarUrl?: string
  timezone?: string
  locale?: string
}
