import { AppError } from '@appraiseme/domain'
import {
  scrubString,
  scrubValue,
  hashId,
  scrubErrorMessage,
  type ScrubOptions,
} from './scrubber.js'

export interface TelemetryEvent {
  name: string
  category:
    'navigation' | 'entry' | 'ai' | 'sync' | 'report' | 'settings' | 'error'
  properties?: Record<string, unknown>
}

export interface ErrorReport {
  errorCode: string
  errorMessage: string
  errorName: string
  category: string
  stackTrace?: string
  appVersion: string
  adapterType?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ObservabilityConfig {
  enabled: boolean
  appVersion: string
  sentryDsn?: string
  adapterType?: string
  telemetryConsent: boolean
}

export interface TelemetryAdapter {
  captureError: (error: ErrorReport) => void
  captureEvent: (event: TelemetryEvent) => void
}

const ERROR_CATEGORIES: Record<string, string> = {
  ZodError: 'validation',
  ValidationError: 'validation',
  AuthenticationError: 'auth',
  AuthorizationError: 'authorization',
  ConnectionError: 'connection',
  SchemaVersionError: 'schema',
  SyncConflictError: 'sync',
  AIProviderError: 'ai',
  RateLimitError: 'rate_limit',
  TypeError: 'type_error',
  ReferenceError: 'reference_error',
  SyntaxError: 'syntax_error',
  RangeError: 'range_error',
  URIError: 'uri_error',
  UnknownError: 'unknown',
}

function classifyError(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name || err.constructor.name
    return ERROR_CATEGORIES[name] ?? 'unknown'
  }
  if (typeof err === 'string') return 'string_error'
  return 'unknown'
}

function scrubStackTrace(stack: string | undefined): string | undefined {
  if (!stack) return undefined
  return scrubString(stack, { allowErrorMessage: true })
}

function isAppError(err: unknown): boolean {
  return err instanceof AppError
}

export function createObservability(config: ObservabilityConfig): {
  captureError: (
    err: unknown,
    context?: Partial<ErrorReport>,
  ) => ErrorReport | null
  captureEvent: (event: TelemetryEvent) => void
  isAppError: typeof isAppError
} {
  let adapter: TelemetryAdapter | null = null

  if (config.sentryDsn) {
    adapter = createSentryAdapter(config)
  }

  const captureError = (
    err: unknown,
    context?: Partial<ErrorReport>,
  ): ErrorReport | null => {
    if (!config.enabled) return null

    const category = classifyError(err)
    const errorCode = err instanceof AppError ? err.code : 'UNKNOWN'
    const errorName = err instanceof Error ? err.name : 'UnknownError'

    let errorMessage = 'Unknown error occurred'
    if (err instanceof AppError) {
      errorMessage = scrubString(err.message, { allowErrorMessage: true })
    } else if (err instanceof Error) {
      errorMessage = scrubString(err.message ?? '')
    }

    const report: ErrorReport = {
      errorCode,
      errorMessage,
      errorName,
      category,
      stackTrace: scrubStackTrace(err instanceof Error ? err.stack : undefined),
      appVersion: config.appVersion,
      timestamp: new Date().toISOString(),
      ...(config.adapterType
        ? { adapterType: scrubString(config.adapterType) }
        : {}),
      ...(context?.metadata
        ? { metadata: scrubValue(context.metadata) as Record<string, unknown> }
        : {}),
    }

    if (adapter) {
      adapter.captureError(report)
    }

    return report
  }

  const captureEvent = (event: TelemetryEvent): void => {
    if (!config.enabled) return
    if (!config.telemetryConsent) return

    const scrubbedEvent: TelemetryEvent = {
      ...event,
      properties: event.properties
        ? (scrubValue(event.properties) as Record<string, unknown>)
        : {},
    }

    if (adapter) {
      adapter.captureEvent(scrubbedEvent)
    }
  }

  return { captureError, captureEvent, isAppError }
}

function createSentryAdapter(_config: ObservabilityConfig): TelemetryAdapter {
  return {
    captureError: (report) => {
      if (typeof console !== 'undefined' && console.error) {
        console.error(
          '[SENTRY]',
          JSON.stringify({
            dsn: '[CONFIGURED]',
            ...report,
          }),
        )
      }
    },
    captureEvent: (event) => {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(
          '[TELEMETRY]',
          JSON.stringify({
            dsn: '[CONFIGURED]',
            ...event,
          }),
        )
      }
    },
  }
}

export { scrubString, scrubValue, hashId, scrubErrorMessage }
export type { ScrubOptions }

export function createObservabilityService(
  config: Partial<ObservabilityConfig>,
) {
  const fullConfig: ObservabilityConfig = {
    enabled: config.enabled ?? false,
    appVersion: config.appVersion ?? 'unknown',
    telemetryConsent: config.telemetryConsent ?? false,
    sentryDsn: config.sentryDsn,
    adapterType: config.adapterType,
  }
  return createObservability(fullConfig)
}
