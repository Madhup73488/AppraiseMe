import { describe, expect, it } from 'vitest'
import {
  PLAN_TIERS,
  PLAN_LIMITS,
  canAccessFeature,
  getRemainingQuota,
} from './index.js'

describe('PLAN_LIMITS', () => {
  it('free tier is fully unlocked (free-only product)', () => {
    expect(PLAN_LIMITS.free.maxEntriesPerMonth).toBeNull()
    expect(PLAN_LIMITS.free.maxProjects).toBeNull()
    expect(PLAN_LIMITS.free.maxReportsPerMonth).toBeNull()
    expect(PLAN_LIMITS.free.aiEnrichment).toBe(true)
    expect(PLAN_LIMITS.free.aiReportGeneration).toBe(true)
    expect(PLAN_LIMITS.free.quarterlyReports).toBe(true)
    expect(PLAN_LIMITS.free.yearlyReports).toBe(true)
    expect(PLAN_LIMITS.free.analyticsExport).toBe(true)
  })

  it('all plans have maxDatabases', () => {
    for (const tier of PLAN_TIERS) {
      expect(PLAN_LIMITS[tier].maxDatabases).toBeGreaterThan(0)
    }
  })
})

describe('canAccessFeature', () => {
  it('free: unlimited entries', () => {
    expect(canAccessFeature('free', 'entries', 999999)).toBe(true)
  })

  it('pro: unlimited entries', () => {
    expect(canAccessFeature('pro', 'entries', 999999)).toBe(true)
  })

  it('free: allows AI enrichment', () => {
    expect(canAccessFeature('free', 'ai_enrichment', 0)).toBe(true)
  })

  it('pro: allows AI enrichment', () => {
    expect(canAccessFeature('pro', 'ai_enrichment', 0)).toBe(true)
  })

  it('free: allows quarterly reports', () => {
    expect(canAccessFeature('free', 'quarterly_reports', 0)).toBe(true)
  })

  it('pro: allows quarterly reports', () => {
    expect(canAccessFeature('pro', 'quarterly_reports', 0)).toBe(true)
  })
})

describe('getRemainingQuota', () => {
  it('free: returns null (unlimited)', () => {
    expect(getRemainingQuota('free', 'entries', 1000000)).toBeNull()
  })

  it('pro: returns null (unlimited)', () => {
    expect(getRemainingQuota('pro', 'entries', 1000000)).toBeNull()
  })
})
