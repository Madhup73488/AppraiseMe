# Security, Privacy, Sync & AI

## 1. Threat model priorities

Protect: 1. AI API keys 2. database credentials 3. authentication
sessions 4. private work content 5. report content 6. billing/account
state

Assume logs, analytics, crash reports and support tooling are possible
leak paths.

## 2. Credential modes

### Cloud encrypted

Credential is encrypted using envelope encryption backed by managed KMS.
Supabase stores ciphertext + key version/context. This enables
cross-device configuration.

### Device only

Credential is stored in OS credential storage: - macOS Keychain -
Windows Credential Manager - Linux Secret Service/keyring where
supported

Our cloud stores only metadata indicating device-only mode.

Do not claim zero knowledge unless cryptographic design actually
guarantees the server cannot decrypt.

## 3. Secret handling rules

Never: - store plaintext secrets in Supabase - store secrets in
localStorage - commit `.env` files - put secrets in URLs/query strings -
log request headers containing credentials - send secrets to
analytics/Sentry - show full secrets after initial entry - expose
Supabase service-role/secret keys to clients

Always: - redact known secret patterns - use short-lived server
sessions - rotate encryption key versions - support credential
replacement/revocation - audit sensitive operations without logging
values - use TLS - validate provider base URLs - prevent SSRF in any
server-side custom-provider connectivity feature

## 4. Privacy boundary

Default desktop architecture:

```text
Our cloud <── account/config ──> Desktop
                                │      │
                                │      └── AI provider (user key)
                                │
                                └───────── user database
```

Prefer work content not traversing our cloud.

If a web feature requires our server to process work content, explicitly
document that path and update privacy UX. Do not silently change the
boundary.

## 5. Analytics

Allowed examples: - feature opened - report generation
succeeded/failed - adapter type - app version - latency bucket -
anonymous error category

Forbidden: - note text - project names by default - report text - AI
prompts containing user content - API keys - database connection
strings - attachment names when sensitive - search queries containing
work content unless explicitly consented and scrubbed

## 6. AI enrichment

Pipeline:

```text
save entry
  ↓
mark enrichment pending
  ↓
retrieve minimal required content
  ↓
structured AI request
  ↓
schema validation
  ↓
apply safe fields
  ↓
mark completed
```

Use structured output validation. Treat model output as untrusted input.

AI may suggest: - entry type - project - tags - concise summary -
qualitative impact - achievement association

AI must not invent: - numeric metrics - dates not evidenced -
people/teams not present - completion status without evidence - business
impact presented as fact without evidence

## 7. Prompt versioning

Every persisted AI-generated artifact should retain enough provenance: -
provider - model - prompt/template version - generated timestamp -
source entry IDs or content hash where appropriate

Prompts belong in versioned modules, not inline across components.

## 8. Report generation

Retrieval precedes generation.

```text
date range
  ↓
filter candidate entries
  ↓
retrieve/rank evidence
  ↓
group by project/achievement/impact
  ↓
generate structured report
  ↓
validate
  ↓
persist claims + evidence
  ↓
render editable report
```

A report claim without evidence should be clearly identified or
excluded.

## 9. Sync

Desktop uses local SQLite + outbox.

Guarantees: - local save is transactional - outbox write occurs in same
local transaction where possible - sync operation has an idempotency
key - retry with exponential backoff and jitter - network failure never
destroys local content - deletions use tombstones until remote
confirmation/retention policy - sync status is observable by the user

## 10. Conflict handling

V1: - compare `version`/`updated_at` - automatically merge independent
metadata where deterministic - do not silently overwrite divergent note
bodies - preserve both versions and prompt user when necessary

## 11. Authentication and authorization

Our Supabase: - RLS on every user/account-scoped table - account
membership checked by policy - least privilege - server-only
billing/webhook credentials - secure OAuth redirect allowlists - rate
limits on sensitive endpoints

Customer Supabase: - guide user to safe publishable-key + RLS
configuration where client access is used - never request a service-role
key for ordinary use - generic PostgreSQL credentials should be scoped
to a dedicated schema/user when possible

## 12. Backups and deletion

Our control plane: - production backups according to paid hosting
capability - account deletion workflow - delete encrypted credentials -
revoke sessions/devices - billing/legal retention documented

Customer data: - deletion operates against the user's configured store -
provide export before destructive operations - make clear that external
DB backups/retention are controlled by their provider

## 13. Dependency security

- lockfile committed
- automated dependency updates
- review postinstall/native dependencies
- avoid unnecessary packages
- license inventory for reused OpenCode/MIT components
- secret scanning in CI
- SAST/linting where useful
- signed desktop releases
