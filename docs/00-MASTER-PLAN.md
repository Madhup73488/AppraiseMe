# Worklog AI --- Product & Engineering Master Plan

> **Purpose:** This `docs/` directory is the source of truth for
> building the product. Implementation code must be created **outside
> `docs/`**. Do not modify architectural decisions casually; when a
> decision changes, update the relevant document first.

## 1. Product vision

Worklog AI is a privacy-oriented, AI-assisted professional work-memory
product. Users capture tiny work updates throughout the day, allow AI to
organize and enrich them, search their history later, and generate
evidence-backed weekly, monthly, half-yearly, yearly, custom-range, and
appraisal summaries.

The product should feel as fast and focused as a native developer tool:
dense but calm, keyboard-first, minimal visual noise, instant
interactions, excellent dark mode, and a split-pane information
architecture inspired by modern desktop tools such as OpenCode. Do
**not** clone another product's branding; use the interaction quality
and density as inspiration.

### Core loop

1.  User presses a global shortcut or opens Quick Capture.
2.  User writes one or two natural-language sentences.
3.  The entry is saved immediately.
4.  AI enrichment happens asynchronously and must never block saving.
5.  AI infers project, type, tags, summary, possible impact, and
    searchable metadata.
6.  Over time, entries become evidence for achievements and reports.
7.  User generates a report for any date range.
8.  Every important AI claim can be traced back to source entries.
9.  User exports the report to PDF, Markdown, DOCX, text, or clipboard.

## 2. Product principles

- **User-owned work data.** Work logs, projects, achievements,
  reports, attachments and embeddings live in the user's selected data
  store.
- **Our cloud is the control plane.** Identity, subscriptions,
  preferences, device metadata, connection metadata and encrypted
  credentials live in our SaaS database.
- **Bring Your Own Database (BYODB).**
- **Bring Your Own AI Key (BYOK).**
- **Save first, enrich later.** AI failure must never lose a note.
- **Evidence over hallucination.** Generated reports must preserve
  links to source entries.
- **Local-first desktop experience.** Capture must remain useful
  during temporary network failure.
- **Adapter boundaries.** Product/domain code must not know whether
  the user uses Supabase, Neon, PostgreSQL or Turso, nor whether AI is
  OpenAI, Anthropic, Gemini or OpenRouter.
- **Progressive complexity.** Simple defaults for normal users;
  advanced provider/model/database settings are optional.
- **Keyboard-first.** Nearly every common action should be reachable
  without a mouse.
- **Fast perceived performance.** Optimistic UI, local cache,
  background processing, streaming where appropriate.

## 3. Recommended technology stack

### Applications

- **Web:** Next.js + React + TypeScript
- **Desktop:** Tauri 2 + React + TypeScript
- **Native desktop layer:** Rust only where Tauri/native integration
  requires it
- **Monorepo:** pnpm workspaces + Turborepo

### Our SaaS control plane

- **Backend platform:** Supabase
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Authorization:** Row Level Security
- **Billing:** Stripe
- **Web deployment:** Vercel
- **Secrets:** envelope encryption using a managed KMS; database
  stores ciphertext, never plaintext secrets
- **Observability:** Sentry + OpenTelemetry-compatible instrumentation

### Client and shared packages

- Tailwind CSS
- shadcn/ui as a primitive starting point
- selected MIT-compatible ideas/components where appropriate, with
  license notices preserved
- TanStack Query for asynchronous/server state
- Zustand only for small client/UI state that genuinely needs a store
- Zod at trust boundaries
- React Hook Form for complex forms
- Vercel AI SDK or a thin internal AI abstraction
- SQLite for desktop cache/outbox

### User data destinations --- launch

1.  Supabase
2.  Neon
3.  Generic PostgreSQL
4.  Turso/libSQL
5.  Local-only SQLite

### Later, based on demand

- MySQL
- MongoDB Atlas

Do not implement six unrelated persistence engines in V1. Supabase, Neon
and generic PostgreSQL should share a PostgreSQL implementation beneath
provider-specific connection/setup UX.

### AI providers --- launch

1.  OpenAI
2.  Anthropic
3.  Google Gemini
4.  OpenRouter
5.  Custom OpenAI-compatible endpoint

## 4. Data ownership boundary

### Stored by our SaaS

- user identity and sessions
- account/workspace membership
- subscription and entitlement state
- user preferences
- selected theme
- device registrations
- database connection metadata
- encrypted database credentials, when cloud sync is enabled
- AI provider configuration
- encrypted AI credentials, when cloud sync is enabled
- schema/version compatibility information
- feature flags and product configuration
- security/audit metadata

### Never intentionally persisted in our control-plane database

- raw work entries
- work-entry AI summaries
- projects from the user's journal
- achievements
- report body/content
- embeddings
- work attachments
- private professional history

Transient processing is a separate security/privacy question. Prefer
direct client-to-user-database and client-to-AI-provider flows for the
desktop application whenever feasible.

## 5. System architecture

```text
                         ┌──────────────────────┐
                         │   OUR CONTROL PLANE  │
                         │ Supabase + Stripe    │
                         │ Auth / Billing /     │
                         │ Config / Secrets*    │
                         └──────────┬───────────┘
                                    │ account/config
                     ┌──────────────┴──────────────┐
                     │                             │
             ┌───────▼────────┐            ┌──────▼───────┐
             │   WEB APP      │            │ DESKTOP APP  │
             │ Next.js/React  │            │ Tauri/React  │
             └───────┬────────┘            └──────┬───────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │ DOMAIN SERVICES   │
                          │ Entries/Reports/  │
                          │ Search/AI/Sync    │
                          └──────┬──────┬─────┘
                                 │      │
                   ┌─────────────┘      └─────────────┐
                   ▼                                  ▼
          ┌─────────────────┐               ┌─────────────────┐
          │ STORAGE ADAPTER │               │   AI ADAPTER    │
          └────────┬────────┘               └────────┬────────┘
                   │                                  │
        ┌──────────┼──────────┐             ┌─────────┼─────────┐
        ▼          ▼          ▼             ▼         ▼         ▼
     Supabase     Neon     Postgres       OpenAI   Anthropic  Gemini
                    \        /                         OpenRouter/etc.
                     \ Turso/
```

`*` Secrets stored in our cloud must be encrypted using envelope
encryption/KMS. Offer device-only credential storage for users who do
not want cloud-synced credentials.

## 6. Primary features

### Capture

- instant quick capture
- global desktop shortcut
- multiline notes
- optional project/type selection
- optional voice capture later
- drafts/autosave
- offline capture
- clipboard-friendly capture
- natural date phrases where useful

### Timeline

- today / this week / month
- chronological work stream
- filter by project/type/tag
- edit/delete/restore
- AI enrichment status
- pin/star important entries

### Projects

- active/archived projects
- AI-suggested project assignment
- project-level timeline
- project summaries
- related achievements

### Achievements and impact

- user-created achievements
- AI-suggested achievements
- evidence links
- measurable impact fields
- confidence/provenance
- never fabricate metrics

### Search / Ask

- lexical search first
- semantic retrieval when supported
- date/project/type filters
- natural-language questions
- answers with evidence/source-entry links

### Reports

- weekly
- monthly
- quarterly
- 6-month
- yearly
- custom date range
- appraisal mode
- report templates
- concise/detailed/leadership/impact styles
- editable before export
- evidence per claim/section
- PDF/Markdown/DOCX/text/clipboard exports

### Integrations

V1 should focus on database + AI providers. GitHub, Jira, Linear, Slack,
Calendar and similar ingestion integrations are later features and must
be opt-in.

### Settings

- account
- subscription
- database connection
- AI provider/key
- simple/advanced model configuration
- theme
- privacy
- device management
- export defaults
- data/schema diagnostics

## 7. Non-goals for V1

Do not build: - team collaboration/CRDTs - enterprise admin console -
microservices - Kafka/event streaming - Kubernetes - a dedicated vector
database - dozens of integrations - mobile apps - social features -
automatic employee surveillance - background collection of work without
explicit user action/permission

## 8. Performance targets

These are engineering targets, not guarantees: - desktop shell
interactive quickly after launch - quick-capture window appears
near-instantly from warm state - note save feels immediate via local
write/optimistic UI - no AI call on the synchronous save path - list
virtualization for large timelines - route/code splitting for heavy
report/editor views - indexed date/project/type queries - debounce
expensive search, not typing itself - background sync with bounded
retries/backoff - avoid N+1 queries - cache stable control-plane
configuration - lazy-load syntax highlighting/large editors/export
engines - stream long AI responses when useful

## 9. Delivery phases

### Phase 0 --- Foundation

Monorepo, CI, lint/typecheck/test, design tokens, Supabase control
plane, auth, base shell, adapter contracts.

### Phase 1 --- Core journal

Desktop + web, quick capture, local cache, PostgreSQL-family adapters,
timeline, projects, edit/delete, sync.

### Phase 2 --- AI enrichment

BYOK, provider adapters, classification, tagging, project inference,
summaries, safe structured outputs.

### Phase 3 --- Reports

Date-range retrieval, report generation, evidence graph, report editor,
exports.

### Phase 4 --- Productization

Stripe, entitlements, onboarding, device management, diagnostics,
telemetry consent, error reporting, production signing/releases.

### Phase 5 --- Intelligence

Hybrid search, embeddings, Ask Worklog, achievement suggestions,
appraisal workflow.

## 10. Definition of done

A feature is not done until: - domain behavior is tested -
loading/empty/error/offline states exist - keyboard behavior is
considered - accessibility is checked - secrets and authorization are
reviewed - analytics contain no work content/secrets - user-visible
errors are actionable - adapters do not leak into UI/domain code -
documentation is updated - no unnecessary duplication is introduced
