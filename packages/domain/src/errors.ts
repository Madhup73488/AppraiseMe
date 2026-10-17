export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', cause)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', cause)
  }
}

export class ConnectionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause)
  }
}

export class SchemaVersionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SCHEMA_VERSION_ERROR', cause)
  }
}

export class SyncConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SYNC_CONFLICT_ERROR', cause)
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', cause)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'RATE_LIMIT_ERROR', cause)
  }
}
