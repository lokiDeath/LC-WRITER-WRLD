import { NextRequest, NextResponse } from 'next/server'

// POST /api/image-gen
// Legacy character-portrait endpoint kept for backwards compatibility.
// It builds a painterly character prompt from { name, appearance, personality }
// and delegates to the multi-provider /api/generate-image logic by importing
// the same route handler. Fal.ai / RunPod / ComfyUI routing, the
// safety_checker=false flag, and the ZAI fallback all live there.
//
// All API keys use `process.env.X || ''` fallbacks so the build never crashes.

async function delegateToGenerateImage(body: Record<string, unknown>) {
  // Reuse the canonical multi-provider route handler so we have ONE source
  // of truth for Fal/RunPod/ComfyUI/ZAI routing + safety_checker=false.
  const { POST } = await import('@/app/api/generate-image/route')
  // Build a synthetic NextRequest so the imported handler can read the body.
  const req = new NextRequest('http://localhost/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return POST(req)
}

export async function POST(req: NextRequest) {
  try {
    const { name, appearance, personality } = await req.json().catch(() => ({}))
    if (!name) {
      return NextResponse.json({ error: 'Name required.' }, { status: 400 })
    }
    // Build the painterly character portrait prompt. The aspect ratio is
    // locked to portrait orientation (2:3) for character headshots.
    const prompt =
      `Painterly character portrait, dark academia aesthetic. ` +
      `${appearance || 'A mysterious figure'}. ` +
      `Mood: ${personality ? String(personality).slice(0, 120) : 'enigmatic'}. ` +
      `Name: ${name}. Dramatic chiaroscuro lighting, oil-painting texture, ` +
      `muted earth tones, dark background. No text. Portrait orientation.`
    const upstream = await delegateToGenerateImage({
      prompt,
      negative_prompt: 'low quality, blurry, distorted, extra limbs, deformed',
      aspect_ratio: '2:3',
    })
    // The upstream handler returns NextResponse.json({ image, prompt, provider })
    // on success. Unwrap and re-shape to { url } so existing callers keep working.
    const data = await upstream.json()
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 502 })
    }
    return NextResponse.json({ url: data.image, prompt: data.prompt, provider: data.provider })
  } catch (err: unknown) {
    console.error('image-gen error', err)
    const message = err instanceof Error ? err.message : 'Image generation failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
