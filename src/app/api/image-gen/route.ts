import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, appearance, personality } = await req.json().catch(() => ({}))
  if (!name) return NextResponse.json({ error: 'Name required.' }, { status: 400 })
  const prompt = `Painterly character portrait, dark academia aesthetic. ${appearance || 'A mysterious figure'}. Mood: ${personality ? personality.slice(0, 120) : 'enigmatic'}. Name: ${name}. Dramatic chiaroscuro lighting, oil-painting texture, muted earth tones, dark background. No text. Portrait orientation.`
  try {
    const zai = await ZAI.create()
    const response = await zai.images.generations.create({ prompt, size: '768x1344' })
    const b64 = response.data[0]?.base64
    if (!b64) throw new Error('no image returned')
    // Return a base64 data URL directly — no disk write (public/ is read-only on Vercel)
    return NextResponse.json({ url: `data:image/png;base64,${b64}` })
  } catch (err: any) {
    console.error('image-gen error', err)
    return NextResponse.json({ error: 'Image generation failed.' }, { status: 502 })
  }
}
