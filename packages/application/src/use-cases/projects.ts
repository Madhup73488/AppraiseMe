import type {
  WorklogStore,
  ProjectDTO,
  CreateProjectInput,
  UpdateProjectInput,
} from '@appraiseme/contracts'

export interface ProjectDeps {
  store: WorklogStore
}

export function createListProjectsUseCase(deps: ProjectDeps) {
  return async (): Promise<ProjectDTO[]> => deps.store.projects.list()
}

export function createCreateProjectUseCase(deps: ProjectDeps) {
  return async (input: CreateProjectInput): Promise<ProjectDTO> =>
    deps.store.projects.create(input)
}

export function createUpdateProjectUseCase(deps: ProjectDeps) {
  return async (id: string, input: UpdateProjectInput): Promise<ProjectDTO> =>
    deps.store.projects.update(id, input)
}

export function createDeleteProjectUseCase(deps: ProjectDeps) {
  return async (id: string): Promise<void> => deps.store.projects.delete(id)
}
