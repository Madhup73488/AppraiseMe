export type { Profile, UpdateProfileInput } from './entities/profile.js'
export type { Account, AccountMember, AccountRole } from './entities/account.js'
export type {
  Subscription,
  SubscriptionStatus,
  Entitlement,
} from './entities/subscription.js'
export type {
  UserPreferences,
  UpdatePreferencesInput,
  ThemeId,
  Density,
  ReportStyle,
} from './entities/preferences.js'
export type {
  Device,
  RegisterDeviceInput,
  DevicePlatform,
} from './entities/device.js'
export type {
  CredentialMetadata,
  CredentialKind,
  CredentialMode,
} from './entities/credential.js'
export type {
  DataConnection,
  DataProvider,
  DataEngine,
  ConnectionStatus,
  AIConnection,
  AIProviderName,
} from './entities/connection.js'
export type { DateRange, ProviderConfiguration } from './entities/common.js'

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  SchemaVersionError,
  SyncConflictError,
  AIProviderError,
  RateLimitError,
} from './errors.js'
