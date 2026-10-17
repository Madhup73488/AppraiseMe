import { createControlPlaneClient } from '@appraiseme/control-plane'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const email = `prod-test-${Date.now()}@example.com`
const password = 'test-password-123'

const cp = createControlPlaneClient({ supabaseUrl: url, supabaseAnonKey: anon })

const { session, needsConfirmation } = await cp.auth.signUp({
  email,
  password,
  displayName: 'Prod Test',
})
console.log('signUp: needsConfirmation =', needsConfirmation, 'session =', !!session)
if (!session) throw new Error('expected immediate session (local auto-confirm)')

const profile = await cp.profiles.get()
console.log('profile:', profile?.display_name)

const accounts = await cp.accounts.list()
console.log('accounts:', accounts.length, accounts[0]?.name)

const members = await cp.accounts.getMembers(accounts[0].id)
console.log('members:', members.map((m) => m.role))

const sub = await cp.billing.getSubscription(accounts[0].id)
console.log('subscription:', sub?.status, sub?.provider)

const ents = await cp.billing.getEntitlements(accounts[0].id)
console.log(
  'entitlements:',
  ents.map((e) => `${e.feature_key}=${e.enabled}${e.limit_value ? `(${e.limit_value})` : ''}`).join(', '),
)

const prefs = await cp.preferences.get()
console.log('preferences theme:', prefs?.theme_id)

const device = await cp.devices.register({
  name: 'test-device',
  platform: 'web',
  appVersion: '0.0.0',
})
console.log('device registered:', device.id !== undefined)

await cp.security.logEvent('test_event', { source: 'e2e-check' })
console.log('security event logged (non-throwing)')

const conn = await cp.dataConnections.create({
  name: 'test-conn',
  provider: 'turso',
  engine: 'libsql',
  credentialMode: 'device_only',
  nonSecretConfig: { url: 'libsql://test.turso.io' },
})
console.log('data connection created:', conn.id !== undefined)

await cp.auth.signOut()
const after = await cp.auth.getSession()
console.log('after signOut session =', after)
if (after) throw new Error('session should be gone')

console.log('\nALL CONTROL-PLANE CHECKS PASSED')
