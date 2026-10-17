import type { NextRequest } from 'next/server'
import type { AIProvider } from '@appraiseme/contracts'
import { decryptSecret } from '@/lib/server/connections-crypto'
import { getAccountId, HttpError, serviceCall, verifyUser } from '@/lib/server/supabase-service'
import { buildProvider } from '@/lib/build-provider'

export interface ResolvedAI {
  provider: AIProvider
  providerName: string
  modelName: string
}

/**
 * Verifies the caller, looks up their stored AI connection, decrypts the key
 * and builds a server-side provider. The API key never leaves the server.
 */
export async function resolveUserAIProvider(
  req: NextRequest,
): Promise<ResolvedAI> {
  const user = await verifyUser(req)
  const accountId = await getAccountId(user.id)

  const rows = (await serviceCall(
    `/ai_connections?account_id=eq.${accountId}&select=*&order=created_at.desc&limit=1`,
  )) as Array<Record<string, unknown>>
  if (!rows?.length) throw new HttpError(404, 'No AI connection configured')

  const row = rows[0]!
  const credentialId = row['credential_id'] as string | null
  if (!credentialId) throw new HttpError(400, 'AI connection has no stored key')

  const creds = (await serviceCall(
    `/credentials?id=eq.${credentialId}&select=encrypted_payload,encryption_key_version,encryption_context`,
  )) as Array<{
    encrypted_payload: string
    encryption_key_version: string
    encryption_context: Record<string, string>
  }>
  if (!creds?.length) throw new HttpError(400, 'AI connection has no stored key')

  const secret = decryptSecret({
    payload: creds[0]!.encrypted_payload,
    keyVersion: creds[0]!.encryption_key_version,
    context: creds[0]!.encryption_context ?? {},
  })

  const providerName = (row['provider'] as string) || 'compatible'
  const modelName = (row['default_model'] as string) || ''
  const provider = await buildProvider(
    {
      provider: providerName,
      baseUrl: (row['base_url'] as string) || undefined,
      model: modelName || undefined,
    },
    secret,
  )

  return { provider, providerName, modelName }
}

export function aiRouteErrorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  if (e instanceof Error && e.name === 'RateLimitError') {
    return Response.json({ error: 'AI provider rate limit exceeded' }, { status: 429 })
  }
  const message = e instanceof Error ? e.message : 'AI request failed'
  return Response.json({ error: message }, { status: 502 })
}
