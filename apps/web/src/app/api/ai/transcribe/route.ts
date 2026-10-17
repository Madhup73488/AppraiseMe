import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { aiRouteErrorResponse, resolveUserAIProvider } from '@/lib/server/ai-resolver'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    const { provider } = await resolveUserAIProvider(req)
    if (!provider.transcribeAudio) {
      return NextResponse.json(
        { error: 'Provider does not support audio transcription' },
        { status: 400 },
      )
    }
    const text = await provider.transcribeAudio(file)
    return NextResponse.json({ text })
  } catch (e) {
    return aiRouteErrorResponse(e)
  }
}
