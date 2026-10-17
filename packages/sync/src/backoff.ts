import type { OutboxEvent, OutboxState } from './types.js'

export function calculateBackoff(
  attempts: number,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
): number {
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempts), maxDelayMs)
  const jitter = Math.random() * 0.3 * exponential
  return Math.round(exponential + jitter)
}

export function shouldDeadLetter(attempts: number, maxAttempts = 10): boolean {
  return attempts >= maxAttempts
}

export function nextRetryTime(attempts: number): string {
  const delay = calculateBackoff(attempts)
  return new Date(Date.now() + delay).toISOString()
}

export function sortPendingByPriority(events: OutboxEvent[]): OutboxEvent[] {
  const priority: Record<OutboxState, number> = {
    pending: 0,
    processing: 1,
    failed: 2,
    succeeded: 3,
    dead_letter: 4,
  }
  return [...events].sort((a, b) => {
    const stateDiff = priority[a.state] - priority[b.state]
    if (stateDiff !== 0) return stateDiff
    return a.createdAt.localeCompare(b.createdAt)
  })
}
