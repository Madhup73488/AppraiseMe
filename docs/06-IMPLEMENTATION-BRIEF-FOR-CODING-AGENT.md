# Implementation Brief for Coding Agent

You are implementing **Worklog AI** using the specifications in this
`docs/` directory.

## Mandatory instructions

1.  Treat `docs/` as specification/reference.
2.  Create all application source code **outside `docs/`**, at the
    repository root according to
    `01-REPOSITORY-STRUCTURE-AND-ARCHITECTURE.md`.
3.  Do not delete or rewrite these docs unless explicitly asked.
4.  Before coding a phase, read all relevant docs.
5.  Prefer the simplest architecture consistent with these documents.
6.  Do not add technologies, services or abstractions without a concrete
    requirement.
7.  Preserve the control-plane/customer-data boundary.
8.  Work logs must never be persisted to our SaaS Supabase.
9.  Never store plaintext API keys or database credentials.
10. Never put secrets in browser bundles, logs, analytics or error
    messages.
11. AI must never be on the synchronous note-save path.
12. All database implementations must satisfy shared adapter contracts.
13. UI/domain code must not directly call provider SDKs.
14. Keep the application keyboard-first and responsive.
15. Build original Worklog branding; OpenCode is UI/UX inspiration, not
    a branding/template copy.

## Initial implementation order

### Milestone 1 --- repository

- pnpm workspace
- Turborepo
- shared TypeScript/ESLint/formatting configuration
- `apps/web`
- `apps/desktop`
- packages defined in architecture
- CI
- environment validation

### Milestone 2 --- design system

- semantic tokens
- Worklog + Midnight + Paper + Minimal + Terminal themes
- core primitives
- AppShell
- Sidebar
- Tabs
- CommandPalette
- QuickCapture shell
- loading/empty/error components

Do not spend time polishing marketing pages before the core application
shell.

### Milestone 3 --- control plane

- Supabase Auth
- profiles/accounts/membership
- preferences
- devices
- data/AI connection metadata
- RLS
- migrations
- encrypted credential service boundary
- Stripe data model stubs/interfaces; billing implementation can
  follow

### Milestone 4 --- customer storage

- canonical contracts
- SQLite local store
- PostgreSQL adapter
- Supabase/Neon connection normalization
- Turso adapter
- migration/version checks
- adapter contract test suite

### Milestone 5 --- journal

- Quick Capture
- local transactional save
- outbox
- sync
- timeline
- project management
- tags
- edit/delete
- sync/error status

### Milestone 6 --- AI

- provider contract
- OpenAI
- Anthropic
- Gemini
- OpenRouter
- OpenAI-compatible
- credential test flow
- structured entry enrichment
- idempotency/content hashes
- AI status/retry UX

### Milestone 7 --- reports

- date ranges
- weekly/monthly/quarterly/half-year/year/custom
- evidence retrieval
- structured report generation
- report claims/evidence
- editor
- Markdown/text export first
- PDF/DOCX next

### Milestone 8 --- productization

- Stripe
- entitlements
- production error handling
- Sentry with aggressive content/secret scrubbing
- updater/signing
- onboarding polish
- diagnostics
- privacy/credential UX

## Engineering behavior

Before implementing: 1. state the milestone/task 2. identify affected
packages 3. identify security/data-boundary implications 4. implement
the smallest coherent vertical slice 5. run lint/typecheck/tests 6. fix
failures rather than suppressing them 7. summarize files changed and
remaining work

## UX quality bar

For every major screen implement: - loading - empty - error -
offline/degraded state where relevant - keyboard navigation - focus
behavior - accessible labels - narrow-window behavior - at least
Worklog + Midnight theme verification; token architecture must support
all five

## Architecture guardrails

Reject patterns like:

```ts
// UI component
supabase.from('work_entries').select('*')
```

Reject:

```ts
localStorage.setItem('openai_key', key)
```

Reject:

```ts
await enrichWithAI(content)
await saveEntry(content)
```

Correct conceptual flow:

```ts
const entry = await localStore.entries.create(input)
await outbox.enqueue({ type: 'entry.created', entityId: entry.id })
backgroundJobs.requestEnrichment(entry.id)
return entry
```

## When specifications are ambiguous

Choose the option that: 1. minimizes exposure of user work content 2.
preserves portability 3. keeps V1 simple 4. avoids irreversible coupling 5. is easy to test

Document important decisions in a short ADR under `docs/adr/` rather
than silently introducing architectural drift.
