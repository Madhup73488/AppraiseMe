import type {
  WorklogStore,
  WorkEntryDTO,
  CreateEntryInput,
} from '@appraiseme/contracts'
import type { OutboxStore } from '@appraiseme/sync'

export interface CaptureEntryInput {
  content: string
  projectId?: string
  entryType?: string
  deviceId?: string
  /** Capture origin: 'manual' (default) | 'voice' */
  source?: string
}

export interface CaptureEntryDeps {
  store: WorklogStore
  outbox?: OutboxStore
}

export function createCaptureEntryUseCase(deps: CaptureEntryDeps) {
  return async (input: CaptureEntryInput): Promise<WorkEntryDTO> => {
    const createInput: CreateEntryInput = {
      content: input.content,
      projectId: input.projectId,
      entryType: input.entryType,
      deviceId: input.deviceId,
      source: input.source,
    }

    if (deps.outbox) {
      return deps.store.transaction(async (tx) => {
        const entry = await tx.entries.create(createInput)

        await deps.outbox!.enqueue({
          entityType: 'work_entry',
          entityId: entry.id,
          operation: 'create',
          payload: JSON.stringify({ entry }),
        })

        return entry
      })
    }

    return deps.store.entries.create(createInput)
  }
}
