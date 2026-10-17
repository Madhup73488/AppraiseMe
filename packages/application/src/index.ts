export {
  createSignUpUseCase,
  createSignInUseCase,
  createSignOutUseCase,
  createGetSessionUseCase,
  type SignUpInput,
  type SignUpResult,
  type SignInInput,
} from './use-cases/auth'

export { createTestDataConnectionUseCase } from './use-cases/test-data-connection'

export { createTestAIConnectionUseCase } from './use-cases/test-ai-connection'

export {
  normalizeConnection,
  type NormalizedConnection,
  type ConnectionConfig,
} from './connection-normalizer'

export {
  createSyncManager,
  type SyncManager,
  type SyncManagerState,
  type SyncManagerStatus,
  type SyncManagerOptions,
  type RemoteStoreHandle,
  type CreateRemoteStore,
} from './sync-manager'

export {
  createCaptureEntryUseCase,
  type CaptureEntryInput,
  type CaptureEntryDeps,
} from './use-cases/capture-entry'

export {
  createListTimelineUseCase,
  type ListTimelineDeps,
} from './use-cases/list-timeline'

export {
  createUpdateEntryUseCase,
  type UpdateEntryDeps,
} from './use-cases/update-entry'

export {
  createDeleteEntryUseCase,
  type DeleteEntryDeps,
} from './use-cases/delete-entry'

export {
  createListProjectsUseCase,
  createCreateProjectUseCase,
  createUpdateProjectUseCase,
  createDeleteProjectUseCase,
  type ProjectDeps,
} from './use-cases/projects'

export {
  createListTagsUseCase,
  createCreateTagUseCase,
  type TagDeps,
} from './use-cases/tags'

export {
  createSearchEntriesUseCase,
  type SearchEntriesDeps,
} from './use-cases/search-entries'

export {
  createEnrichEntryUseCase,
  type EnrichEntryDeps,
} from './use-cases/enrich-entry'

export {
  createTestAIConnectionHealthUseCase,
  type TestAIConnectionDeps,
} from './use-cases/test-ai-connection-health'

export {
  createGenerateReportUseCase,
  type GenerateReportDeps,
  type GenerateReportRequest,
} from './use-cases/generate-report'

export {
  createAskWorklogUseCase,
  type AskWorklogDeps,
  type AskWorklogResult,
} from './use-cases/ask-worklog'

export {
  createBackfillToRemoteUseCase,
  type BackfillDeps,
  type BackfillResult,
} from './use-cases/backfill'

export {
  createListReportsUseCase,
  createGetReportUseCase,
  type ListReportsDeps,
} from './use-cases/list-reports'
