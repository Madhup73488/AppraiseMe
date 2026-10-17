import type { WorklogStore, TagDTO } from '@appraiseme/contracts'

export interface TagDeps {
  store: WorklogStore
}

export function createListTagsUseCase(deps: TagDeps) {
  return async (): Promise<TagDTO[]> => deps.store.tags.list()
}

export function createCreateTagUseCase(deps: TagDeps) {
  return async (name: string): Promise<TagDTO> => deps.store.tags.create(name)
}
