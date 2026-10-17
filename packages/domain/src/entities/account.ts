export type AccountRole = 'owner' | 'admin' | 'member'

export interface Account {
  id: string
  name: string
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

export interface AccountMember {
  accountId: string
  userId: string
  role: AccountRole
  createdAt: string
}
