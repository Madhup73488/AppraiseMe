export interface DateRange {
  from: string
  to: string
}

export interface ProviderConfiguration {
  provider: string
  baseUrl?: string
  defaultModel?: string
  enrichmentModel?: string
  reportModel?: string
  embeddingModel?: string
}
