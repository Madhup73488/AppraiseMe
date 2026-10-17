import type { WorklogStore } from '@appraiseme/contracts'
import type { OutboxStore } from '@appraiseme/sync'

export interface DeleteEntryDeps {
  store: WorklogStore
  outbox?: OutboxStore
}

export function createDeleteEntryUseCase(deps: DeleteEntryDeps) {
  return async (id: string): Promise<void> => {
    if (deps.outbox) {
      await deps.store.transaction(async (tx) => {
        await tx.entries.delete(id)

        await deps.outbox!.enqueue({
          entityType: 'work_entry',
          entityId: id,
          operation: 'delete',
          payload: JSON.stringify({ id }),
        })
      })
      return
    }

    await deps.store.entries.delete(id)
  }
}
