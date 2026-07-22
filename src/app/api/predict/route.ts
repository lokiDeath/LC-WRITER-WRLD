import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, style } = await req.json().catch(() => ({}))
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ prediction: '' })
  }

  // Keep the window small for low-latency suggestions
  const window = text.slice(-500)

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You are an inline autocomplete engine for a novel editor. The author is writing ' +
            (style || 'literary fiction') +
            '. Continue the sentence naturally. Output ONLY the continuation — no quotes, no preamble, no more than ~20 words. Stop at a natural sentence or clause break.',
        },
        { role: 'user', content: window },
      ],
      thinking: { type: 'disabled' },
    })
    const prediction = (completion.choices[0]?.message?.content || '').trim()
    return NextResponse.json({ prediction })
  } catch {
    return NextResponse.json({ prediction: '' })
  }
}
