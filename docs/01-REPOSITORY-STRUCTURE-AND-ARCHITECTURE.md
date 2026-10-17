# Repository Structure & Architecture

## 1. Repository layout

```text
worklog-ai/
├── docs/                         # specifications only; no runtime code
├── apps/
│   ├── web/                      # Next.js web product
│   ├── desktop/                  # Tauri shell + React desktop entry
│   └── site/                     # optional marketing/docs site; can initially live in web
├── packages/
│   ├── ui/                       # reusable presentation components
│   ├── themes/                   # semantic tokens + theme definitions
│   ├── domain/                   # pure business entities/rules
│   ├── application/              # use-cases/orchestration
│   ├── contracts/                # adapter interfaces/DTO boundaries
│   ├── control-plane/            # client for our Supabase
│   ├── storage/
│   │   ├── postgres/
│   │   ├── sqlite/
│   │   └── turso/
│   ├── ai/
│   │   ├── core/
│   │   ├── openai/
│   │   ├── anthropic/
│   │   ├── gemini/
│   │   ├── openrouter/
│   │   └── compatible/
│   ├── sync/                     # local outbox/sync/conflict handling
│   ├── search/                   # lexical/hybrid/semantic abstractions
│   ├── reports/                  # report generation/domain formatting
│   ├── export/                   # PDF/MD/DOCX/text exporters
│   ├── security/                 # credential abstraction/redaction helpers
│   ├── config/                   # typed environment/runtime config
│   ├── observability/            # logging/tracing/error reporting
│   └── test-utils/
├── supabase/
│   ├── migrations/               # OUR control-plane schema only
│   ├── functions/                # only when justified
│   └── seed.sql
├── customer-schema/
│   ├── postgres/                 # canonical customer-data migrations
│   ├── sqlite/
│   └── turso/
├── tooling/
│   ├── eslint/
│   ├── typescript/
│   └── scripts/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 2. Dependency rule

Dependencies flow inward toward stable abstractions:

```text
apps
 ↓
application
 ↓
domain + contracts
 ↑
storage / ai / search / export adapters
```

Forbidden: - domain importing React, Next.js, Supabase SDK, Stripe SDK,
AI SDK or a database driver - UI calling Supabase/customer DB directly -
route components containing SQL - provider-specific types leaking
through public application interfaces

## 3. Domain layer

Pure TypeScript. No network/database/UI dependencies.

Core concepts: - WorkEntry - Project - Tag - Achievement - Impact - Goal
(later) - Report - ReportClaim - EvidenceReference - DateRange -
ProviderConfiguration

Domain rules should be functions/value objects where possible rather
than giant service classes.

## 4. Application layer

Use cases orchestrate contracts:

```text
CreateWorkEntry
UpdateWorkEntry
DeleteWorkEntry
EnrichWorkEntry
SearchWorkHistory
GenerateReport
GenerateAppraisal
CreateAchievement
SyncPendingChanges
TestDataConnection
TestAIConnection
```

A use case receives dependencies explicitly. Avoid hidden global
singletons.

## 5. Storage contract

```ts
interface WorklogStore {
  entries: EntryRepository
  projects: ProjectRepository
  tags: TagRepository
  achievements: AchievementRepository
  reports: ReportRepository
  search: SearchRepository
  transaction<T>(fn: (tx: WorklogStore) => Promise<T>): Promise<T>
}
```

Provider UX and engine implementation are separate.
Supabase/Neon/generic PostgreSQL can all resolve to a PostgreSQL store
after connection normalization.

## 6. AI contract

```ts
interface AIProvider {
  generate<T>(request: StructuredGenerationRequest<T>): Promise<T>
  stream?(request: TextGenerationRequest): AsyncIterable<string>
  embed?(texts: string[]): Promise<number[][]>
  testConnection(): Promise<ProviderHealth>
}
```

Application-level AI capabilities should be separate from raw providers:

```text
EntryEnricher
ReportWriter
AchievementSuggester
WorkHistoryAnswerer
```

This allows prompt/model changes without changing UI.

## 7. Control plane vs user data plane

`packages/control-plane` may talk to our Supabase. It must never become
the default place to store journal entities.

Use separate naming: - `ControlPlaneClient` - `WorklogStore`

Never name both `db`.

## 8. Desktop local-first flow

```text
Capture
  ↓
SQLite transaction
  ↓
UI confirms save
  ↓
Outbox event
  ├─→ sync to configured user database
  └─→ enqueue AI enrichment
```

AI enrichment writes a new revision/update and must be idempotent.

## 9. Sync model

Use an outbox, not distributed magic.

Each mutable customer entity should carry: - `id` - `created_at` -
`updated_at` - `version` - `device_id` - `deleted_at` where soft
deletion is required

Outbox states: - pending - processing - succeeded - failed - dead_letter

Use exponential backoff + jitter. Never infinite hot-loop retries.

V1 conflict strategy: - detect version mismatch - preserve both versions
where data loss is possible - surface a conflict UI for meaningful note
conflicts - metadata fields can use deterministic last-write behavior
where safe

## 10. Web architecture

The web app does not need desktop offline/native behavior. Reuse
domain/application/UI packages but use browser-safe implementations.

Do not bundle: - database drivers requiring Node/native runtime into
client components - server credentials into browser code - KMS
credentials - Supabase service-role/secret keys

## 11. API/backend strategy

Supabase is the control plane. Prefer direct Supabase Auth/RLS for
ordinary account/config CRUD. Add server routes/functions for: - Stripe
webhooks - privileged billing operations - credential
encryption/decryption mediation - operations requiring server-only
secrets - signed downloads/releases if later needed

Do not create a separate microservice merely to proxy simple CRUD.

## 12. Testing pyramid

- domain unit tests: numerous and fast
- adapter contract tests: same behavioral suite against each adapter
- integration tests: Supabase/DB/AI mocked or test projects
- component tests: critical interactive components
- Playwright E2E: onboarding, capture, timeline, report generation,
  settings
- Tauri smoke tests for native integration where practical

The most valuable reusable test asset is an **adapter contract test
suite**. Any new database adapter must pass it.
