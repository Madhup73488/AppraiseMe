# syntax=docker/dockerfile:1
# =============================================================================
# AppraiseMe web app — production image
# Build (from repo root):
#   podman build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     -t appraiseme-web .
# Run:
#   podman run -p 3000:3000 \
#     -e SUPABASE_SERVICE_ROLE_KEY=... \
#     -e ENCRYPTION_MASTER_KEY=<64-hex> \
#     appraiseme-web
# NEXT_PUBLIC_* values are inlined at build time by Next.js.
# Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_MASTER_KEY)
# are read from process.env at runtime — pass them with `docker run -e`,
# never as build args or NEXT_PUBLIC_* values.
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- deps: install workspace dependencies ----
FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/application/package.json packages/application/
COPY packages/sync/package.json packages/sync/
COPY packages/ui/package.json packages/ui/
COPY packages/themes/package.json packages/themes/
COPY packages/config/package.json packages/config/
COPY packages/control-plane/package.json packages/control-plane/
COPY packages/export/package.json packages/export/
COPY packages/reports/package.json packages/reports/
COPY packages/search/package.json packages/search/
COPY packages/security/package.json packages/security/
COPY packages/observability/package.json packages/observability/
COPY packages/diagnostics/package.json packages/diagnostics/
COPY packages/entitlements/package.json packages/entitlements/
COPY packages/test-utils/package.json packages/test-utils/
COPY packages/storage/memory/package.json packages/storage/memory/
COPY packages/storage/sqlite/package.json packages/storage/sqlite/
COPY packages/storage/postgres/package.json packages/storage/postgres/
COPY packages/storage/turso/package.json packages/storage/turso/
COPY packages/storage/supabase/package.json packages/storage/supabase/
COPY packages/ai/core/package.json packages/ai/core/
COPY packages/ai/openai/package.json packages/ai/openai/
COPY packages/ai/anthropic/package.json packages/ai/anthropic/
COPY packages/ai/gemini/package.json packages/ai/gemini/
COPY packages/ai/openrouter/package.json packages/ai/openrouter/
COPY packages/ai/compatible/package.json packages/ai/compatible/
COPY tooling/eslint/package.json tooling/eslint/
RUN pnpm install --frozen-lockfile --filter "@appraiseme/web..."

# ---- build: compile packages + web app ----
FROM deps AS build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter "@appraiseme/web^..." run build \
  && pnpm --filter @appraiseme/web run build

# ---- runtime: minimal standalone server ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
