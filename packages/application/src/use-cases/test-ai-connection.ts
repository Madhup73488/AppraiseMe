import type { ControlPlaneClient } from '@appraiseme/contracts'
import { AIProviderError } from '@appraiseme/domain'

export interface TestAIConnectionUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export function createTestAIConnectionUseCase(
  deps: TestAIConnectionUseCaseDeps,
) {
  return async function testAIConnection(connectionId: string): Promise<{
    status: string
  }> {
    try {
      return await deps.controlPlane.aiConnections.verify(connectionId)
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'AI connection test failed',
        error,
      )
    }
  }
}
