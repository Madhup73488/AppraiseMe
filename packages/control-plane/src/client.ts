import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  ControlPlaneClient,
  AuthSession,
  SignUpInput,
  SignInInput,
  CreateDataConnectionInput,
  CreateAIConnectionInput,
} from '@appraiseme/contracts'
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
  Subscription,
  Entitlement,
} from '@appraiseme/domain'
import {
  AuthenticationError as AuthErr,
  ConnectionError,
} from '@appraiseme/domain'

export interface CreateControlPlaneClientOptions {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function createControlPlaneClient(
  options: CreateControlPlaneClientOptions,
): ControlPlaneClient {
  const supabase: SupabaseClient = createClient(
    options.supabaseUrl,
    options.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  )

  function toAuthSession(
    session: {
      user: { id: string; email: string }
      access_token: string
      expires_at: string
    } | null,
  ): AuthSession | null {
    if (!session) return null
    return {
      userId: session.user.id,
      email: session.user.email,
      accessToken: session.access_token,
      expiresAt: new Date(Number(session.expires_at) * 1000).toISOString(),
    }
  }

  const auth: ControlPlaneClient['auth'] = {
    async signUp(input: SignUpInput) {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: input.displayName
            ? { display_name: input.displayName }
            : undefined,
        },
      })

      if (error) throw new AuthErr(error.message, error)

      return {
        session: toAuthSession(
          data.session
            ? {
                user: { id: data.user!.id, email: data.user!.email! },
                access_token: data.session.access_token,
                expires_at: data.session.expires_at!.toString(),
              }
            : null,
        ),
        needsConfirmation: !data.session,
      }
    },

    async signIn(input: SignInInput) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (error) throw new AuthErr(error.message, error)
      const session = toAuthSession(
        data.session
          ? {
              user: { id: data.user!.id, email: data.user!.email! },
              access_token: data.session.access_token,
              expires_at: data.session.expires_at!.toString(),
            }
          : null,
      )
      if (!session) throw new AuthErr('No session returned')
      return session
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw new AuthErr(error.message, error)
    },

    async getSession() {
      const { data } = await supabase.auth.getSession()
      return toAuthSession(
        data.session
          ? {
              user: {
                id: data.session.user.id,
                email: data.session.user.email!,
              },
              access_token: data.session.access_token,
              expires_at: data.session.expires_at!.toString(),
            }
          : null,
      )
    },

    onAuthStateChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(
          toAuthSession(
            session
              ? {
                  user: { id: session.user.id, email: session.user.email! },
                  access_token: session.access_token,
                  expires_at: session.expires_at!.toString(),
                }
              : null,
          ),
        )
      })
      return () => data.subscription.unsubscribe()
    },
  }

  const profiles: ControlPlaneClient['profiles'] = {
    async get() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .maybeSingle()
      if (error) throw new ConnectionError(error.message, error)
      if (!data) return null
      return data as Profile
    },

    async update(input: UpdateProfileInput) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new AuthErr('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: input.displayName,
          avatar_url: input.avatarUrl,
          timezone: input.timezone,
          locale: input.locale,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.user.id)
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as Profile
    },
  }

  const accounts: ControlPlaneClient['accounts'] = {
    async list() {
      const { data, error } = await supabase.from('accounts').select('*')
      if (error) throw new ConnectionError(error.message, error)
      return data as Account[]
    },

    async getMembers(accountId: string) {
      const { data, error } = await supabase
        .from('account_members')
        .select('*')
        .eq('account_id', accountId)
      if (error) throw new ConnectionError(error.message, error)
      return data as AccountMember[]
    },
  }

  const preferences: ControlPlaneClient['preferences'] = {
    async get() {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .maybeSingle()
      if (error) throw new ConnectionError(error.message, error)
      if (!data) return null
      return {
        ...data,
        themeId: data.theme_id,
        weekStartsOn: data.week_starts_on,
        defaultReportStyle: data.default_report_style,
        advancedAiSettings: data.advanced_ai_settings,
        telemetryEnabled: data.telemetry_enabled,
      } as UserPreferences
    },

    async update(input: UpdatePreferencesInput) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new AuthErr('Not authenticated')

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (input.themeId !== undefined) update.theme_id = input.themeId
      if (input.density !== undefined) update.density = input.density
      if (input.weekStartsOn !== undefined)
        update.week_starts_on = input.weekStartsOn
      if (input.defaultReportStyle !== undefined)
        update.default_report_style = input.defaultReportStyle
      if (input.advancedAiSettings !== undefined)
        update.advanced_ai_settings = input.advancedAiSettings
      if (input.telemetryEnabled !== undefined)
        update.telemetry_enabled = input.telemetryEnabled

      const { data, error } = await supabase
        .from('user_preferences')
        .update(update)
        .eq('user_id', userData.user.id)
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return {
        ...data,
        themeId: data.theme_id,
        weekStartsOn: data.week_starts_on,
        defaultReportStyle: data.default_report_style,
        advancedAiSettings: data.advanced_ai_settings,
        telemetryEnabled: data.telemetry_enabled,
      } as UserPreferences
    },
  }

  const devices: ControlPlaneClient['devices'] = {
    async list() {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new ConnectionError(error.message, error)
      return data as Device[]
    },

    async register(input: RegisterDeviceInput) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new AuthErr('Not authenticated')

      const { data, error } = await supabase
        .from('devices')
        .insert({
          user_id: userData.user.id,
          name: input.name,
          platform: input.platform,
          app_version: input.appVersion ?? null,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as Device
    },

    async revoke(deviceId: string) {
      const { error } = await supabase
        .from('devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', deviceId)
      if (error) throw new ConnectionError(error.message, error)
    },
  }

  const dataConnections: ControlPlaneClient['dataConnections'] = {
    async list() {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as DataConnection[]
    },

    async create(input: CreateDataConnectionInput) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new AuthErr('Not authenticated')

      const { data: accountData } = await supabase
        .from('account_members')
        .select('account_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .single()

      if (!accountData) throw new AuthErr('No account found')

      let credentialId: string | null = null
      if (input.encryptedCredential && input.encryptionKeyVersion) {
        const { data: credData, error: credError } = await supabase
          .from('credentials')
          .insert({
            account_id: accountData.account_id,
            kind: 'database',
            encrypted_payload: Array.from(input.encryptedCredential),
            encryption_key_version: input.encryptionKeyVersion,
            encryption_context: input.encryptionContext ?? {},
          })
          .select('id')
          .single()
        if (credError) throw new ConnectionError(credError.message, credError)
        credentialId = credData.id
      }

      const { data, error } = await supabase
        .from('data_connections')
        .insert({
          account_id: accountData.account_id,
          created_by: userData.user.id,
          name: input.name,
          provider: input.provider,
          engine: input.engine,
          credential_id: credentialId,
          credential_mode: input.credentialMode,
          non_secret_config: input.nonSecretConfig,
          status: 'unverified',
        })
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as DataConnection
    },

    async update(id, input) {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (input.name !== undefined) update.name = input.name
      if (input.provider !== undefined) update.provider = input.provider
      if (input.engine !== undefined) update.engine = input.engine
      if (input.credentialMode !== undefined)
        update.credential_mode = input.credentialMode
      if (input.nonSecretConfig !== undefined)
        update.non_secret_config = input.nonSecretConfig

      const { data, error } = await supabase
        .from('data_connections')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as DataConnection
    },

    async delete(id) {
      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', id)
      if (error) throw new ConnectionError(error.message, error)
    },

    async verify(id) {
      const { data, error } = await supabase
        .from('data_connections')
        .update({
          status: 'connected',
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('status, schema_version')
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return {
        status: data.status as string,
        schemaVersion:
          (data as { schema_version?: number }).schema_version ?? null,
      }
    },
  }

  const aiConnections: ControlPlaneClient['aiConnections'] = {
    async list() {
      const { data, error } = await supabase
        .from('ai_connections')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as AIConnection[]
    },

    async create(input: CreateAIConnectionInput) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new AuthErr('Not authenticated')

      const { data: accountData } = await supabase
        .from('account_members')
        .select('account_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .single()

      if (!accountData) throw new AuthErr('No account found')

      let credentialId: string | null = null
      if (input.encryptedCredential && input.encryptionKeyVersion) {
        const { data: credData, error: credError } = await supabase
          .from('credentials')
          .insert({
            account_id: accountData.account_id,
            kind: 'ai',
            encrypted_payload: Array.from(input.encryptedCredential),
            encryption_key_version: input.encryptionKeyVersion,
            encryption_context: input.encryptionContext ?? {},
          })
          .select('id')
          .single()
        if (credError) throw new ConnectionError(credError.message, credError)
        credentialId = credData.id
      }

      const { data, error } = await supabase
        .from('ai_connections')
        .insert({
          account_id: accountData.account_id,
          created_by: userData.user.id,
          name: input.name,
          provider: input.provider,
          credential_id: credentialId,
          credential_mode: input.credentialMode,
          base_url: input.baseUrl ?? null,
          default_model: input.defaultModel ?? null,
          enrichment_model: input.enrichmentModel ?? null,
          report_model: input.reportModel ?? null,
          embedding_model: input.embeddingModel ?? null,
          enabled: true,
        })
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as AIConnection
    },

    async update(id, input) {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (input.name !== undefined) update.name = input.name
      if (input.provider !== undefined) update.provider = input.provider
      if (input.baseUrl !== undefined) update.base_url = input.baseUrl
      if (input.defaultModel !== undefined)
        update.default_model = input.defaultModel
      if (input.enrichmentModel !== undefined)
        update.enrichment_model = input.enrichmentModel
      if (input.reportModel !== undefined)
        update.report_model = input.reportModel
      if (input.embeddingModel !== undefined)
        update.embedding_model = input.embeddingModel

      const { data, error } = await supabase
        .from('ai_connections')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as AIConnection
    },

    async delete(id) {
      const { error } = await supabase
        .from('ai_connections')
        .delete()
        .eq('id', id)
      if (error) throw new ConnectionError(error.message, error)
    },

    async verify(id) {
      const { error } = await supabase
        .from('ai_connections')
        .update({
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return { status: 'connected' }
    },
  }

  const credentials: ControlPlaneClient['credentials'] = {
    async store(
      accountId,
      kind,
      encryptedPayload,
      encryptionKeyVersion,
      encryptionContext,
    ) {
      const { data, error } = await supabase
        .from('credentials')
        .insert({
          account_id: accountId,
          kind,
          encrypted_payload: Array.from(encryptedPayload),
          encryption_key_version: encryptionKeyVersion,
          encryption_context: encryptionContext ?? {},
        })
        .select(
          'id, account_id, kind, encryption_key_version, encryption_context, created_at, updated_at, last_used_at',
        )
        .single()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as CredentialMetadata
    },

    async retrieve(id) {
      const { data, error } = await supabase
        .from('credentials')
        .select(
          'id, account_id, kind, encrypted_payload, encryption_key_version, encryption_context, created_at, updated_at, last_used_at',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw new ConnectionError(error.message, error)
      if (!data) return null
      const payload = new Uint8Array(data.encrypted_payload as number[])
      const { encrypted_payload: _encrypted_payload, ...metadata } = data
      return {
        metadata: metadata as unknown as CredentialMetadata,
        payload,
      }
    },

    async delete(id) {
      const { error } = await supabase.from('credentials').delete().eq('id', id)
      if (error) throw new ConnectionError(error.message, error)
    },
  }

  const billing: ControlPlaneClient['billing'] = {
    async getSubscription(accountId: string) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle()
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as Subscription | null
    },

    async getEntitlements(accountId: string) {
      const { data, error } = await supabase
        .from('entitlements')
        .select('*')
        .eq('account_id', accountId)
      if (error) throw new ConnectionError(error.message, error)
      return data as unknown as Entitlement[]
    },
  }

  const securityEvents: ControlPlaneClient['security'] = {
    async logEvent(eventType: string, metadata: Record<string, string>) {
      const { data: userData } = await supabase.auth.getUser()
      const { data: accountData } = await supabase
        .from('account_members')
        .select('account_id')
        .eq('user_id', userData.user?.id ?? '')
        .limit(1)
        .maybeSingle()

      const { error } = await supabase.from('security_events').insert({
        account_id: accountData?.account_id ?? null,
        user_id: userData.user?.id ?? null,
        event_type: eventType,
        metadata,
      })
      if (error) {
        // Security event logging must never throw and disrupt user flow
        console.error('Failed to log security event:', error.message)
      }
    },
  }

  return {
    auth,
    profiles,
    accounts,
    preferences,
    devices,
    dataConnections,
    aiConnections,
    credentials,
    billing,
    security: securityEvents,
  }
}
