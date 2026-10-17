import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { decryptSecret, encryptSecret } from '@/lib/server/connections-crypto'
import {
  getAccountId,
  HttpError,
  serviceCall,
  verifyUser,
} from '@/lib/server/supabase-service'

export const runtime = 'nodejs'

interface ConnectionPayload {
  type: 'data' | 'ai'
  name?: string
  config: Record<string, string>
  secret: string
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyUser(req)
    const type = req.nextUrl.searchParams.get('type')
    if (type !== 'data' && type !== 'ai') {
      return NextResponse.json({ error: 'type must be data or ai' }, { status: 400 })
    }
    const accountId = await getAccountId(user.id)

    const table = type === 'data' ? 'data_connections' : 'ai_connections'
    const rows = (await serviceCall(
      `/${table}?account_id=eq.${accountId}&select=*&order=created_at.desc&limit=1`,
    )) as Array<Record<string, unknown>>
    if (!rows?.length) return NextResponse.json({ connection: null })

    const row = rows[0]!
    let secret: string | null = null
    const credentialId = row['credential_id'] as string | null
    if (credentialId) {
      const creds = (await serviceCall(
        `/credentials?id=eq.${credentialId}&select=encrypted_payload,encryption_key_version,encryption_context`,
      )) as Array<{
        encrypted_payload: string
        encryption_key_version: string
        encryption_context: Record<string, string>
      }>
      if (creds?.length) {
        secret = decryptSecret({
          payload: creds[0]!.encrypted_payload,
          keyVersion: creds[0]!.encryption_key_version,
          context: creds[0]!.encryption_context ?? {},
        })
      }
    }

    const config =
      type === 'data'
        ? ((row['non_secret_config'] as Record<string, string>) ?? {})
        : {
            baseUrl: (row['base_url'] as string) ?? '',
            defaultModel: (row['default_model'] as string) ?? '',
            enrichmentModel: (row['enrichment_model'] as string) ?? '',
            reportModel: (row['report_model'] as string) ?? '',
            provider: (row['provider'] as string) ?? '',
          }

    return NextResponse.json({
      connection: {
        id: row['id'],
        name: row['name'],
        config,
        // data connections ship the key to the browser (it is the publishable
        // key of the user's own project); AI keys never leave the server —
        // the browser uses the /api/ai proxy instead
        secret: type === 'data' ? secret : null,
        hasSecret: secret !== null,
        lastVerifiedAt: row['last_verified_at'],
      },
    })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyUser(req)
    const body = (await req.json()) as ConnectionPayload
    if (body.type !== 'data' && body.type !== 'ai') {
      return NextResponse.json({ error: 'type must be data or ai' }, { status: 400 })
    }
    if (!body.secret) {
      return NextResponse.json({ error: 'secret is required' }, { status: 400 })
    }
    const accountId = await getAccountId(user.id)

    // encrypt secret
    const enc = encryptSecret(body.secret)
    const credRows = (await serviceCall('/credentials', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        account_id: accountId,
        kind: body.type === 'data' ? 'database' : 'ai',
        encrypted_payload: enc.payload,
        encryption_key_version: enc.keyVersion,
        encryption_context: enc.context,
      }),
    })) as Array<{ id: string }>
    if (!credRows?.length) throw new HttpError(502, 'Credential insert failed')
    const credentialId = credRows[0]!.id

    const table = body.type === 'data' ? 'data_connections' : 'ai_connections'
    // remove any existing rows for this account (one connection per type)
    await serviceCall(`/${table}?account_id=eq.${accountId}`, { method: 'DELETE' })

    const insert =
      body.type === 'data'
        ? {
            account_id: accountId,
            created_by: user.id,
            name: body.name || 'My Supabase',
            provider: 'supabase',
            engine: 'postgres',
            credential_id: credentialId,
            credential_mode: 'cloud_encrypted',
            non_secret_config: body.config,
            status: 'unverified',
          }
        : {
            account_id: accountId,
            created_by: user.id,
            name: body.name || 'My AI provider',
            provider: body.config['provider'] || 'compatible',
            credential_id: credentialId,
            credential_mode: 'cloud_encrypted',
            base_url: body.config['baseUrl'] || null,
            default_model: body.config['defaultModel'] || null,
            enrichment_model: body.config['enrichmentModel'] || null,
            report_model: body.config['reportModel'] || null,
          }

    const rows = (await serviceCall(`/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(insert),
    })) as Array<{ id: string }>
    if (!rows?.length) throw new HttpError(502, 'Connection insert failed')

    return NextResponse.json({ connection: { id: rows[0]!.id } })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyUser(req)
    const type = req.nextUrl.searchParams.get('type')
    if (type !== 'data' && type !== 'ai') {
      return NextResponse.json({ error: 'type must be data or ai' }, { status: 400 })
    }
    const accountId = await getAccountId(user.id)
    const table = type === 'data' ? 'data_connections' : 'ai_connections'
    await serviceCall(`/${table}?account_id=eq.${accountId}`, { method: 'DELETE' })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status })
  }
}
