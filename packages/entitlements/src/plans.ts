export type PlanTier = 'free' | 'pro' | 'team'

export interface PlanLimits {
  maxEntriesPerMonth: number | null
  maxProjects: number | null
  maxReportsPerMonth: number | null
  maxDatabases: number
  aiEnrichment: boolean
  aiReportGeneration: boolean
  quarterlyReports: boolean
  yearlyReports: boolean
  analyticsExport: boolean
  prioritySupport: boolean
}

/**
 * The product currently ships free-only: the free tier is fully unlocked.
 * Pro/team tiers are retained for a future paid launch; flip the values
 * here and in the signup migration when billing is introduced.
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxEntriesPerMonth: null,
    maxProjects: null,
    maxReportsPerMonth: null,
    maxDatabases: 3,
    aiEnrichment: true,
    aiReportGeneration: true,
    quarterlyReports: true,
    yearlyReports: true,
    analyticsExport: true,
    prioritySupport: false,
  },
  pro: {
    maxEntriesPerMonth: null,
    maxProjects: null,
    maxReportsPerMonth: null,
    maxDatabases: 3,
    aiEnrichment: true,
    aiReportGeneration: true,
    quarterlyReports: true,
    yearlyReports: true,
    analyticsExport: true,
    prioritySupport: false,
  },
  team: {
    maxEntriesPerMonth: null,
    maxProjects: null,
    maxReportsPerMonth: null,
    maxDatabases: 10,
    aiEnrichment: true,
    aiReportGeneration: true,
    quarterlyReports: true,
    yearlyReports: true,
    analyticsExport: true,
    prioritySupport: true,
  },
}

export type FeatureKey =
  | 'entries'
  | 'projects'
  | 'reports'
  | 'databases'
  | 'ai_enrichment'
  | 'ai_reports'
  | 'quarterly_reports'
  | 'yearly_reports'
  | 'analytics_export'
  | 'priority_support'

export interface Entitlement {
  accountId: string
  featureKey: FeatureKey
  enabled: boolean
  limitValue: number | null
  updatedAt: string
}

export interface SubscriptionInfo {
  accountId: string
  planTier: PlanTier
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  provider: string
  createdAt: string
  updatedAt: string
}

export function canAccessFeature(
  plan: PlanTier,
  feature: FeatureKey,
  currentUsage: number,
): boolean {
  const limits = PLAN_LIMITS[plan]

  switch (feature) {
    case 'entries':
      return limits.maxEntriesPerMonth !== null
        ? currentUsage < limits.maxEntriesPerMonth
        : true
    case 'projects':
      return limits.maxProjects !== null
        ? currentUsage < limits.maxProjects
        : true
    case 'reports':
      return limits.maxReportsPerMonth !== null
        ? currentUsage < limits.maxReportsPerMonth
        : true
    case 'databases':
      return currentUsage < limits.maxDatabases
    case 'ai_enrichment':
      return limits.aiEnrichment
    case 'ai_reports':
      return limits.aiReportGeneration
    case 'quarterly_reports':
      return limits.quarterlyReports
    case 'yearly_reports':
      return limits.yearlyReports
    case 'analytics_export':
      return limits.analyticsExport
    case 'priority_support':
      return limits.prioritySupport
    default:
      return false
  }
}

export function getRemainingQuota(
  plan: PlanTier,
  feature: 'entries' | 'projects' | 'reports',
  currentUsage: number,
): number | null {
  const limits = PLAN_LIMITS[plan]
  const max =
    feature === 'entries'
      ? limits.maxEntriesPerMonth
      : feature === 'projects'
        ? limits.maxProjects
        : limits.maxReportsPerMonth

  if (max === null) return null
  return Math.max(0, max - currentUsage)
}

export const PLAN_TIERS: PlanTier[] = ['free', 'pro', 'team']

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
}

export const PLAN_PRICES: Record<
  PlanTier,
  { monthly: number; yearly: number } | null
> = {
  free: null,
  pro: { monthly: 12, yearly: 120 },
  team: { monthly: 24, yearly: 240 },
}
