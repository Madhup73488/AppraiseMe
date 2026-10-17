export interface StructuredGenerationRequest<T = unknown> {
  systemPrompt: string
  userPrompt: string
  schema: unknown
  model?: string
  temperature?: number
  parse: (value: unknown) => T
}

export interface TextGenerationRequest {
  systemPrompt: string
  userPrompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ProviderHealth {
  healthy: boolean
  latencyMs?: number
  error?: string
}

export interface AIProvider {
  generate<T>(request: StructuredGenerationRequest<T>): Promise<T>
  stream?(request: TextGenerationRequest): AsyncIterable<string>
  embed?(texts: string[]): Promise<number[][]>
  /**
   * Speech-to-text via the provider's /audio/transcriptions endpoint
   * (OpenAI-compatible). Optional — only some providers support it.
   */
  transcribeAudio?(audio: Blob, model?: string): Promise<string>
  testConnection(): Promise<ProviderHealth>
}
