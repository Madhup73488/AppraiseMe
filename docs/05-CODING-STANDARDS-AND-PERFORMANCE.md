# Coding Standards, Maintainability & Performance

## 1. Philosophy

Optimize for code that another engineer can safely modify six months
later.

Priorities: 1. correctness 2. security/privacy 3. clarity 4. testability 5. performance 6. terseness

Do not create abstractions merely to reduce line count.

## 2. TypeScript

- strict mode enabled
- avoid `any`; use `unknown` at untrusted boundaries
- prefer discriminated unions for state
- validate external data with Zod
- do not use type assertions to silence real problems
- prefer immutable data transformations
- public package APIs must have explicit types
- keep provider SDK types behind adapters

Example:

```ts
type SyncState =
  | { status: 'idle' }
  | { status: 'syncing'; startedAt: Date }
  | { status: 'failed'; error: AppError; retryAt?: Date }
```

Better than booleans such as `isSyncing`, `hasError`, `isIdle` that can
become contradictory.

## 3. Naming

- components: `PascalCase`
- hooks: `useSomething`
- functions/variables: `camelCase`
- constants: descriptive camelCase; reserve screaming snake case for
  true environment/global constants
- interfaces/types: domain names, not `IWorkEntry`
- booleans: `is`, `has`, `can`, `should`
- handlers: `handleSave`; callback props: `onSave`
- repositories: `EntryRepository`, implementations:
  `PostgresEntryRepository`
- avoid vague `utils.ts`; create focused modules

## 4. File organization

Prefer feature/cohesion boundaries over giant global folders.

Bad:

```text
components/
  180 unrelated files
utils/
  helpers.ts
```

Better:

```text
features/report/
  components/
  hooks/
  report.routes.ts
  report.presenter.ts

packages/reports/
  domain/
  application/
  prompts/
```

Keep files focused. Split when responsibilities diverge, not at an
arbitrary line count.

## 5. React rules

- server/client boundary explicit in Next.js
- no network requests directly inside reusable visual components
- keep state as close to usage as possible
- don't put every value in Zustand
- use TanStack Query for asynchronous remote state
- derive state instead of synchronizing duplicate state with effects
- avoid effect-driven business logic
- stable keys; never array index for mutable lists
- memoization only after identifying meaningful rerender cost
- virtualize large timelines
- error boundaries around major surfaces

## 6. Components

A reusable component: - has one clear responsibility - accepts
domain-neutral props where appropriate - exposes composition slots
instead of dozens of booleans - supports keyboard/accessibility - uses
semantic theme tokens - has loading/disabled/error behavior where
relevant

Avoid:

```tsx
<Card isReport isCompact isTimeline isProject showMagic specialMode />
```

Prefer separate composed product components over configuration
explosions.

## 7. Business logic

Business rules do not live in JSX.

Bad:

```tsx
if (subscription.plan === "pro" && report.type === "yearly" ...)
```

Prefer:

```ts
const access = reportPolicy.canGenerate({ entitlement, reportType })
```

This makes policy testable and reusable across web/desktop.

## 8. Errors

Use typed application errors:

```text
ValidationError
AuthenticationError
AuthorizationError
ConnectionError
SchemaVersionError
SyncConflictError
AIProviderError
RateLimitError
```

Provider errors are translated at adapter boundaries. UI should not
depend on OpenAI/Postgres error shapes.

## 9. Logging

Structured logs: - event - severity - request/operation id -
adapter/provider name - duration - safe metadata

Never log work content or secrets by default.

## 10. Database performance

- index `(owner_id, occurred_at)`
- index common filters
- paginate timeline by cursor, not large offsets
- avoid `select *`
- batch tag/evidence loading
- use transactions for multi-table invariants
- inspect query plans for slow paths
- connection pooling/serverless-safe access where relevant
- avoid one query per entry

## 11. Frontend performance

- route-level lazy loading
- dynamically load report export/editor dependencies
- virtualize large lists
- cache provider metadata
- optimistic entry creation
- local-first desktop reads
- defer enrichment
- use Web Workers/native side only for proven heavy CPU work
- compress large exports where appropriate
- avoid huge JSON blobs in React state

## 12. AI cost/performance

BYOK does not mean waste tokens.

- send only relevant evidence
- use smaller/faster model for classification
- reserve stronger model for appraisal/report writing
- cache enrichment using content hash
- don't regenerate unchanged entries
- batch embeddings
- configurable model per capability in advanced mode
- cap retrieval context
- stream long prose output where it improves UX

## 13. Security in code review

Every PR touching credentials/auth/storage asks: - can this value reach
logs? - can it reach client bundle? - is authorization enforced
server-side/RLS? - are URLs/provider errors sanitized? - does this
broaden access? - does analytics receive content?

## 14. Tests

### Unit

Pure domain logic and formatters.

### Contract

Run identical repository behavior tests against PostgreSQL, SQLite/Turso
and future adapters.

### Integration

Control-plane auth/RLS, Stripe webhook behavior, migration behavior,
provider normalization.

### E2E

- signup/login
- onboarding
- connect database
- connect AI
- quick capture
- offline save then sync
- edit entry
- generate report
- evidence navigation
- export
- credential removal

Tests must not depend on production credentials.

## 15. Formatting/tooling

Recommended: - ESLint - Prettier - TypeScript strict - Husky/lint-staged
only if it remains fast and useful - CI: install → lint → typecheck →
unit → integration → build - Playwright E2E on protected/main branches -
conventional commit style optional; consistency matters more than
ceremony

## 16. Git/PR conventions

Small coherent PRs. PR description: - problem - approach - screenshots
for UI - test evidence - migration/security impact - follow-ups

Never mix broad formatting refactors with behavior changes.

## 17. Comments

Comment **why**, invariants and non-obvious tradeoffs. Do not narrate
obvious code.

Good:

```ts
// Keep the local outbox write in this transaction so a crash cannot
// produce a visible entry that will never be synced.
```

Bad:

```ts
// Increment version
version++
```

## 18. Performance budgets

Track: - desktop startup - quick-capture open latency - timeline first
render - sync queue latency/error rate - report generation latency - JS
bundle sizes - memory with large timelines

Optimize measured bottlenecks. Do not prematurely add distributed
infrastructure.

## 19. Definition of reusable code

Code is reusable when: - dependency direction is correct -
inputs/outputs are explicit - it does not know unnecessary provider/UI
details - behavior has tests - naming communicates intent

Do not force reuse between superficially similar features when their
behavior is different.
