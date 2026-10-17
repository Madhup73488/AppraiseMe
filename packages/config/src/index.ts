export { BRAND, type Brand } from './branding'

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  ENCRYPTION_MASTER_KEY: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(input: Record<string, string | undefined>): Env {
  return envSchema.parse(input)
}

export function safeParseEnv(
  input: Record<string, string | undefined>,
): { success: true; data: Env } | { success: false; error: z.ZodError } {
  return envSchema.safeParse(input)
}
