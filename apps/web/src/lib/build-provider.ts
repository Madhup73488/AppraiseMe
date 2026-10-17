import type { AIProvider } from '@appraiseme/contracts'

export interface AIConfig {
  provider: string
  baseUrl?: string
  model?: string
}

export async function buildProvider(
  config: AIConfig,
  apiKey: string,
): Promise<AIProvider> {
  const shared = {
    apiKey,
    defaultModel: config.model,
    baseUrl: config.baseUrl || undefined,
  }
  switch (config.provider) {
    case 'openai': {
      const { createOpenAIProvider } = await import('@appraiseme/ai-openai')
      return createOpenAIProvider(shared)
    }
    case 'anthropic': {
      const { createAnthropicProvider } = await import('@appraiseme/ai-anthropic')
      return createAnthropicProvider(shared)
    }
    case 'gemini': {
      const { createGeminiProvider } = await import('@appraiseme/ai-gemini')
      return createGeminiProvider(shared)
    }
    case 'openrouter': {
      const { createOpenRouterProvider } = await import(
        '@appraiseme/ai-openrouter'
      )
      return createOpenRouterProvider(shared)
    }
    case 'compatible': {
      const { createCompatibleProvider } = await import(
        '@appraiseme/ai-compatible'
      )
      if (!config.baseUrl) {
        throw new Error('Custom endpoint requires a base URL')
      }
      return createCompatibleProvider({
        apiKey,
        baseUrl: config.baseUrl,
        defaultModel: config.model,
      })
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}
