export type OutboxState =
  'pending' | 'processing' | 'succeeded' | 'failed' | 'dead_letter'

export type OutboxOperation = 'create' | 'update' | 'delete'

export interface OutboxEvent {
  id: string
  entityType: string
  entityId: string
  operation: OutboxOperation
  payload: string
  state: OutboxState
  attempts: number
  lastError: string | null
  nextRetryAt: string | null
  createdAt: string
  processedAt: string | null
}

export interface OutboxStore {
  enqueue(
    event: Omit<
      OutboxEvent,
      | 'id'
      | 'state'
      | 'attempts'
      | 'lastError'
      | 'nextRetryAt'
      | 'createdAt'
      | 'processedAt'
    >,
  ): Promise<string>
  getPending(limit?: number): Promise<OutboxEvent[]>
  markProcessing(id: string): Promise<void>
  markSucceeded(id: string): Promise<void>
  markFailed(id: string, error: string, nextRetryAt: string): Promise<void>
  markDeadLetter(id: string, error: string): Promise<void>
  getById(id: string): Promise<OutboxEvent | null>
  countPending(): Promise<number>
}

export interface ConflictInfo {
  entityId: string
  localVersion: number
  remoteVersion: number
  localUpdatedAt: string
  remoteUpdatedAt: string
}
