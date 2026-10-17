import { describe, it, expect } from 'vitest'
import {
  calculateBackoff,
  shouldDeadLetter,
  nextRetryTime,
  sortPendingByPriority,
} from './backoff.js'
import type { OutboxEvent, OutboxState } from './types.js'

describe('calculateBackoff', () => {
  it('grows exponentially and is capped', () => {
    const first = calculateBackoff(0, 1000, 30000)
    const second = calculateBackoff(1, 1000, 30000)
    const third = calculateBackoff(2, 1000, 30000)
    const capped = calculateBackoff(30, 1000, 30000)

    expect(first).toBeGreaterThanOrEqual(1000)
    expect(first).toBeLessThanOrEqual(1300)
    expect(second).toBeGreaterThanOrEqual(2000)
    expect(second).toBeLessThanOrEqual(2600)
    expect(third).toBeGreaterThanOrEqual(4000)
    expect(third).toBeLessThanOrEqual(5200)
    expect(capped).toBeGreaterThanOrEqual(30000)
    expect(capped).toBeLessThanOrEqual(39000)
  })
})

describe('shouldDeadLetter', () => {
  it('dead-letters at max attempts', () => {
    expect(shouldDeadLetter(9)).toBe(false)
    expect(shouldDeadLetter(10)).toBe(true)
    expect(shouldDeadLetter(11)).toBe(true)
  })

  it('supports custom max attempts', () => {
    expect(shouldDeadLetter(3, 3)).toBe(true)
    expect(shouldDeadLetter(2, 3)).toBe(false)
  })
})

describe('nextRetryTime', () => {
  it('returns a future ISO timestamp', () => {
    const before = Date.now()
    const retryAt = nextRetryTime(1)
    const parsed = new Date(retryAt)
    expect(parsed.getTime()).toBeGreaterThan(before)
    expect(Number.isNaN(parsed.getTime())).toBe(false)
  })
})

describe('sortPendingByPriority', () => {
  function event(
    id: string,
    state: OutboxState,
    createdAt: string,
  ): OutboxEvent {
    return {
      id,
      entityType: 'work_entry',
      entityId: id,
      operation: 'create',
      payload: '{}',
      state,
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt,
      processedAt: null,
    }
  }

  it('sorts by state priority', () => {
    const events = [
      event('succeeded', 'succeeded', '2024-01-01T00:00:05Z'),
      event('failed', 'failed', '2024-01-01T00:00:05Z'),
      event('processing', 'processing', '2024-01-01T00:00:05Z'),
      event('dead', 'dead_letter', '2024-01-01T00:00:05Z'),
      event('pending', 'pending', '2024-01-01T00:00:05Z'),
    ]

    const sorted = sortPendingByPriority(events)
    expect(sorted.map((e) => e.state)).toEqual([
      'pending',
      'processing',
      'failed',
      'succeeded',
      'dead_letter',
    ])
  })

  it('breaks ties by creation time', () => {
    const events = [
      event('b', 'pending', '2024-01-01T00:00:02Z'),
      event('a', 'pending', '2024-01-01T00:00:01Z'),
    ]

    const sorted = sortPendingByPriority(events)
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b'])
  })
})
