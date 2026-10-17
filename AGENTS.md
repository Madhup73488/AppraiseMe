# AGENTS.md

## Project

**AppraiseMe** — a privacy-oriented, AI-assisted professional work-memory product.

## Architecture

This is a pnpm monorepo with Turborepo. See `docs/` for full specifications.

### Key rules

- `docs/` is specification only — never create runtime code inside it
- All source code lives under `apps/` and `packages/`
- Dependencies flow inward: `apps → application → domain + contracts ← adapters`
- Domain code must not import React, Next.js, Supabase SDK, AI SDK, or database drivers
- UI must not call Supabase or customer DB directly
- Never store plaintext secrets in env, localStorage, logs, or analytics
- AI must never be on the synchronous note-save path
- All database adapters must satisfy shared adapter contracts

### Commands

```bash
pnpm dev          # Start dev servers
pnpm build        # Build all packages and apps
pnpm lint         # Run ESLint across the monorepo
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Run tests
pnpm format       # Format with Prettier
```

### Tech stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 15 + React 19 + TypeScript
- **Desktop:** Tauri 2 + React 19 + Vite
- **Styling:** Tailwind CSS + semantic design tokens
- **State:** TanStack Query (server state), Zustand (small UI state)
- **Validation:** Zod at trust boundaries
- **Testing:** Vitest (when added)

### Package scope

All packages use the `@appraiseme/` scope:
`@appraiseme/ui`, `@appraiseme/domain`, `@appraiseme/contracts`, etc.
