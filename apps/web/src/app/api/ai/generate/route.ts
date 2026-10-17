import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { aiRouteErrorResponse, resolveUserAIProvider } from '@/lib/server/ai-resolver'

export const runtime = 'nodejs'

interface GenerateBody {
  systemPrompt: unknown
  userPrompt: unknown
  model?: unknown
  temperature?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody
    if (typeof body.systemPrompt !== 'string' || !body.systemPrompt) {
      return NextResponse.json({ error: 'systemPrompt is required' }, { status: 400 })
    }
    if (typeof body.userPrompt !== 'string' || !body.userPrompt) {
      return NextResponse.json({ error: 'userPrompt is required' }, { status: 400 })
    }

    const { provider, modelName } = await resolveUserAIProvider(req)
    const data = await provider.generate({
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      schema: { type: 'object' },
      model: typeof body.model === 'string' && body.model ? body.model : modelName || undefined,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      parse: (v: unknown) => v,
    })

    return NextResponse.json({ data })
  } catch (e) {
    return aiRouteErrorResponse(e)
  }
}
