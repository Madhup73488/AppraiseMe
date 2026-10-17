import type {
  WorklogStore,
  WorkEntryDTO,
  UpdateEntryInput,
} from '@appraiseme/contracts'
import type { OutboxStore } from '@appraiseme/sync'

export interface UpdateEntryDeps {
  store: WorklogStore
  outbox?: OutboxStore
}

export function createUpdateEntryUseCase(deps: UpdateEntryDeps) {
  return async (id: string, input: UpdateEntryInput): Promise<WorkEntryDTO> => {
    if (deps.outbox) {
      return deps.store.transaction(async (tx) => {
        const entry = await tx.entries.update(id, input)

        await deps.outbox!.enqueue({
          entityType: 'work_entry',
          entityId: entry.id,
          operation: 'update',
          payload: JSON.stringify({ entry }),
        })

        return entry
      })
    }

    return deps.store.entries.update(id, input)
  }
}
