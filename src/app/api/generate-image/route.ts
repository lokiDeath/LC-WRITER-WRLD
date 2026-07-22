import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/generate-image
// Generates an image from a text prompt using the z-ai-web-dev-sdk image generation API.
// Accepts: { prompt, negative_prompt?, aspect_ratio? }
// Returns: { image: "data:image/png;base64,..." } or { image: "https://..." }
//
// Environment: ZAI_API_KEY (optional — falls back to empty string, which uses the SDK's default)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { prompt, negative_prompt, aspect_ratio } = body as {
      prompt?: string
      negative_prompt?: string
      aspect_ratio?: string
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }

    // Use the z-ai-web-dev-sdk for image generation.
    // The SDK is already installed and works server-side only.
    // We use dynamic import to avoid build issues if the SDK is not configured.
    const ZAI_API_KEY = process.env.ZAI_API_KEY || ''

    try {
      const ZAIModule = await import('z-ai-web-dev-sdk')
      const ZAI = ZAIModule.default
      const zai = await ZAI.create()

      // Use the images.generate method if available
      const response = await (zai as any).images.generate({
        prompt: prompt.trim(),
        negative_prompt: negative_prompt?.trim() || undefined,
        size: aspect_ratio || '1024x1024',
      })

      // The SDK returns either a URL or base64 data
      const imageUrl = response?.data?.[0]?.url || response?.data?.[0]?.b64_json
      if (!imageUrl) {
        throw new Error('No image returned from the API')
      }

      // If it's base64, format it as a data URL
      const image = imageUrl.startsWith('http')
        ? imageUrl
        : `data:image/png;base64,${imageUrl}`

      return NextResponse.json({ image, prompt: prompt.trim() })
    } catch (sdkErr: any) {
      console.error('[generate-image] SDK error:', sdkErr?.message || sdkErr)

      // Fallback: if the SDK fails (e.g., no API key configured), return a helpful error
      return NextResponse.json({
        error: 'Image generation failed. The AI image service may not be configured. Set ZAI_API_KEY in your environment variables.',
        details: sdkErr?.message || 'Unknown SDK error',
      }, { status: 502 })
    }
  } catch (err: any) {
    console.error('[generate-image] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
