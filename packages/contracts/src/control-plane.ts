import type {
  Profile,
  UpdateProfileInput,
  Account,
  AccountMember,
  UserPreferences,
  UpdatePreferencesInput,
  Device,
  RegisterDeviceInput,
  DataConnection,
  AIConnection,
  CredentialMetadata,
  CredentialKind,
  CredentialMode,
  Subscription,
  Entitlement,
} from '@appraiseme/domain'

export interface AuthSession {
  userId: string
  email: string
  accessToken: string
  expiresAt: string
}

export interface SignUpInput {
  email: string
  password: string
  displayName?: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface CreateDataConnectionInput {
  name: string
  provider: string
  engine: string
  credentialMode: CredentialMode
  nonSecretConfig: Record<string, string>
  encryptedCredential?: Uint8Array
  encryptionKeyVersion?: string
  encryptionContext?: Record<string, string>
}

export interface CreateAIConnectionInput {
  name: string
  provider: string
  credentialMode: CredentialMode
  baseUrl?: string
  defaultModel?: string
  enrichmentModel?: string
  reportModel?: string
  embeddingModel?: string
  encryptedCredential?: Uint8Array
  encryptionKeyVersion?: string
  encryptionContext?: Record<string, string>
}

export interface ControlPlaneClient {
  auth: {
    signUp(
      input: SignUpInput,
    ): Promise<{ session: AuthSession | null; needsConfirmation: boolean }>
    signIn(input: SignInInput): Promise<AuthSession>
    signOut(): Promise<void>
    getSession(): Promise<AuthSession | null>
    onAuthStateChange(
      callback: (session: AuthSession | null) => void,
    ): () => void
  }

  profiles: {
    get(): Promise<Profile | null>
    update(input: UpdateProfileInput): Promise<Profile>
  }

  accounts: {
    list(): Promise<Account[]>
    getMembers(accountId: string): Promise<AccountMember[]>
  }

  preferences: {
    get(): Promise<UserPreferences | null>
    update(input: UpdatePreferencesInput): Promise<UserPreferences>
  }

  devices: {
    list(): Promise<Device[]>
    register(input: RegisterDeviceInput): Promise<Device>
    revoke(deviceId: string): Promise<void>
  }

  dataConnections: {
    list(): Promise<DataConnection[]>
    create(input: CreateDataConnectionInput): Promise<DataConnection>
    update(
      id: string,
      input: Partial<CreateDataConnectionInput>,
    ): Promise<DataConnection>
    delete(id: string): Promise<void>
    verify(
      id: string,
    ): Promise<{ status: string; schemaVersion: number | null }>
  }

  aiConnections: {
    list(): Promise<AIConnection[]>
    create(input: CreateAIConnectionInput): Promise<AIConnection>
    update(
      id: string,
      input: Partial<CreateAIConnectionInput>,
    ): Promise<AIConnection>
    delete(id: string): Promise<void>
    verify(id: string): Promise<{ status: string }>
  }

  credentials: {
    store(
      accountId: string,
      kind: CredentialKind,
      encryptedPayload: Uint8Array,
      encryptionKeyVersion: string,
      encryptionContext?: Record<string, string>,
    ): Promise<CredentialMetadata>
    retrieve(
      id: string,
    ): Promise<{ metadata: CredentialMetadata; payload: Uint8Array } | null>
    delete(id: string): Promise<void>
  }

  billing: {
    getSubscription(accountId: string): Promise<Subscription | null>
    getEntitlements(accountId: string): Promise<Entitlement[]>
  }

  security: {
    logEvent(eventType: string, metadata: Record<string, string>): Promise<void>
  }
}
