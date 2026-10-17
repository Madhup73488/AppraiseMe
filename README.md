# AppraiseMe

A privacy-oriented, AI-assisted professional work-memory product. Capture work
as it happens, organize and enrich it, search your history, and generate
evidence-backed reports and appraisals.

This is a pnpm monorepo built with Turborepo. Full specifications live in
`docs/`.

## Repository layout

```text
apps/
  web/        Next.js 15 + React 19 web client
  desktop/    Tauri 2 + Vite desktop client
packages/
  ai/         AI provider adapters (openai, anthropic, gemini, openrouter, compatible)
  application/  Use-case orchestration layer
  config/     Branding configuration
  contracts/  Shared adapter contracts (storage, AI, control plane)
  control-plane/  Supabase control-plane client
  diagnostics/    Health checks and diagnostics
  domain/     Domain entities and errors (no framework imports)
  entitlements/   Plan and entitlement definitions
  export/     Report exporters (Markdown, text, JSON, clipboard, download)
  observability/  Logging with secret scrubbing
  reports/    Structured report types, evidence ranking, rendering, AI writer
  search/     Lexical search engine and SearchRepository adapter
  security/   Credential redaction helpers
  storage/    WorklogStore adapters: postgres, sqlite, turso, memory
  sync/       Outbox-based sync engine with exponential backoff
  test-utils/ Shared storage contract test harness
  themes/     Semantic design tokens and the five shipped themes
  ui/         React component library (primitives + product components)
supabase/     Control-plane migrations, triggers, and seed data
customer-schema/  Customer database schemas (postgres, sqlite, turso)
tooling/     Shared eslint and typescript configs
docs/         Specifications only — no runtime code
```

## Getting started

Requirements: Node.js >= 20, pnpm >= 9.

```bash
pnpm install
pnpm dev          # start dev servers
```

Copy `.env.example` to `.env.local` and fill in the values you need. None of
the secrets should ever be committed.

## Commands

```bash
pnpm dev          # Start dev servers
pnpm build        # Build all packages and apps
pnpm lint         # Run ESLint across the monorepo
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Run tests
pnpm format       # Format with Prettier
pnpm clean        # Remove build outputs and node_modules
```

## Testing

Most packages run their unit tests with Vitest via `pnpm test`. Adapter
packages verify conformance against the shared
`@appraiseme/test-utils` storage contract harness:

- **sqlite** — runs out of the box against a temporary database file
- **memory** — runs out of the box
- **turso** — runs against a temporary local libSQL file; set
  `TEST_TURSO_URL` and `TEST_TURSO_TOKEN` to run against a real Turso
  database
- **postgres** — skipped unless `TEST_POSTGRES_URL` points at a disposable
  PostgreSQL database (the adapter runs its migrations on connect)

Example:

```bash
TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/worklog_test \
  pnpm --filter @appraiseme/storage-postgres test
```

## Architecture rules

- `docs/` is specification only — never create runtime code inside it
- All source code lives under `apps/` and `packages/`
- Dependencies flow inward: `apps → application → domain + contracts ← adapters`
- Domain code must not import React, Next.js, Supabase SDK, AI SDK, or database drivers
- UI must not call Supabase or customer DB directly
- Never store plaintext secrets in env, localStorage, logs, or analytics
- AI must never be on the synchronous note-save path
- All database adapters must satisfy shared adapter contracts

## Storage adapters

Every adapter implements the `WorklogStore` contract from
`@appraiseme/contracts` (entries, projects, tags, achievements, reports,
search, transactions, schema versioning). The web and desktop apps currently
run on `@appraiseme/storage-memory` with localStorage persistence; swap in the
sqlite/postgres/turso adapters for real deployments.
