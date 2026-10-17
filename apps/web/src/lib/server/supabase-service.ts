import type { NextRequest } from 'next/server'

// server-side override wins (e.g. docker network address); falls back to
// the public URL for local dev where both are the same host
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface SupabaseUser {
  id: string
  email?: string
}

export async function verifyUser(req: NextRequest): Promise<SupabaseUser> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Missing authorization')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new HttpError(401, 'Invalid session')
  const user = (await res.json()) as SupabaseUser
  if (!user?.id) throw new HttpError(401, 'Invalid session')
  return user
}

export function serviceHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function serviceCall(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init?.headers as object) },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(502, `Control plane request failed: ${text.slice(0, 300)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getAccountId(userId: string): Promise<string> {
  const rows = (await serviceCall(
    `/account_members?user_id=eq.${userId}&select=account_id&limit=1`,
  )) as Array<{ account_id: string }>
  if (!rows?.length) throw new HttpError(404, 'No account found for user')
  return rows[0]!.account_id
}
