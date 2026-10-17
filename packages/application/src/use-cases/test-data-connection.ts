import type { ControlPlaneClient } from '@appraiseme/contracts'
import { ConnectionError } from '@appraiseme/domain'

export interface TestDataConnectionUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export function createTestDataConnectionUseCase(
  deps: TestDataConnectionUseCaseDeps,
) {
  return async function testDataConnection(connectionId: string): Promise<{
    status: string
    schemaVersion: number | null
  }> {
    try {
      return await deps.controlPlane.dataConnections.verify(connectionId)
    } catch (error) {
      throw new ConnectionError(
        error instanceof Error ? error.message : 'Connection test failed',
        error,
      )
    }
  }
}
