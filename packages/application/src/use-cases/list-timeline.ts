import type {
  WorklogStore,
  WorkEntryDTO,
  ListEntriesInput,
} from '@appraiseme/contracts'

export interface ListTimelineDeps {
  store: WorklogStore
}

export function createListTimelineUseCase(deps: ListTimelineDeps) {
  return async (input: ListEntriesInput): Promise<WorkEntryDTO[]> => {
    return deps.store.entries.list(input)
  }
}
