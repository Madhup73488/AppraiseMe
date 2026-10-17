import type { AIProvider, ProviderHealth } from '@appraiseme/contracts'

export interface TestAIConnectionDeps {
  provider: AIProvider
}

export function createTestAIConnectionHealthUseCase(
  deps: TestAIConnectionDeps,
) {
  return async (): Promise<ProviderHealth> => {
    return deps.provider.testConnection()
  }
}
