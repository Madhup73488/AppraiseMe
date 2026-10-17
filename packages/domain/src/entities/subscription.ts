export type SubscriptionStatus =
  'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid'

export interface Subscription {
  accountId: string
  provider: string
  customerId: string | null
  subscriptionId: string | null
  priceId: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  updatedAt: string
}

export interface Entitlement {
  accountId: string
  featureKey: string
  enabled: boolean
  limitValue: number | null
  updatedAt: string
}
