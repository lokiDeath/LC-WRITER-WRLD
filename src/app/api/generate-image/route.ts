import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/generate-image
// Generates an image from a text prompt.
//
// Routing priority (per spec — Fal.ai / RunPod / ComfyUI with safety_checker=false):
//   1. FAL_KEY present  -> Fal.ai REST endpoint (safety_checker=false)
//   2. RUNPOD_API_KEY present -> RunPod serverless endpoint (safety_checker=false)
//   3. COMFYUI_HOST present -> ComfyUI HTTP API (no safety checker by default)
//   4. Fallback -> ZAI SDK (server-side only, used when no external provider is configured)
//
// Accepts: { prompt, negative_prompt?, aspect_ratio? }
// Returns: { image: "data:image/png;base64,..." } or { image: "https://..." }
//
// All API keys use `process.env.X || ''` fallbacks so the build never crashes.

const ASPECT_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1024x576',
  '9:16': '576x1024',
  '4:3': '1024x768',
  '3:4': '768x1024',
  '2:3': '768x1152',
  '3:2': '1152x768',
}

function resolveSize(aspectRatio?: string): string {
  if (!aspectRatio) return '1024x1024'
  if (ASPECT_TO_SIZE[aspectRatio]) return ASPECT_TO_SIZE[aspectRatio]
  // If already in WxH form, pass through
  if (/^\d+x\d+$/.test(aspectRatio)) return aspectRatio
  return '1024x1024'
}

// ─── Fal.ai ───
async function generateViaFal(
  prompt: string,
  negativePrompt: string | undefined,
  size: string
): Promise<string> {
  const FAL_KEY = process.env.FAL_KEY || ''
  const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/flux/schnell'
  const [width, height] = size.split('x').map(Number)

  const res = await fetch(`https://fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt || '',
      image_size: { width, height },
      // Per spec: safety_checker disabled.
      safety_checker: false,
      num_images: 1,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Fal.ai request failed: ${res.status} ${errText}`)
  }
  const data = await res.json()
  const imageUrl =
    data?.images?.[0]?.url ||
    data?.image?.url ||
    data?.output?.[0] ||
    data?.images?.[0]?.b64_json
  if (!imageUrl) throw new Error('Fal.ai returned no image')
  if (imageUrl.startsWith('http')) return imageUrl
  return `data:image/png;base64,${imageUrl}`
}

// ─── RunPod ───
async function generateViaRunPod(
  prompt: string,
  negativePrompt: string | undefined,
  size: string
): Promise<string> {
  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || ''
  const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || ''
  if (!RUNPOD_ENDPOINT_ID) throw new Error('RUNPOD_ENDPOINT_ID not configured')
  const [width, height] = size.split('x').map(Number)

  // Submit job
  const submitRes = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: negativePrompt || '',
          width,
          height,
          // Per spec: safety_checker disabled.
          safety_checker: false,
          num_outputs: 1,
        },
      }),
    }
  )
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '')
    throw new Error(`RunPod submit failed: ${submitRes.status} ${errText}`)
  }
  const submitData = await submitRes.json()
  const jobId = submitData?.id
  if (!jobId) throw new Error('RunPod returned no job id')

  // Poll for completion (max 60s)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const statusRes = await fetch(
      `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` },
      }
    )
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    if (statusData.status === 'COMPLETED') {
      const imageUrl =
        statusData?.output?.[0] ||
        statusData?.output?.images?.[0]?.url ||
        statusData?.output?.image
      if (!imageUrl) throw new Error('RunPod completed but returned no image')
      if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl
      return `data:image/png;base64,${imageUrl}`
    }
    if (statusData.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${statusData.error || 'unknown'}`)
    }
  }
  throw new Error('RunPod job timed out after 60s')
}

// ─── ComfyUI ───
async function generateViaComfyUI(
  prompt: string,
  negativePrompt: string | undefined,
  size: string
): Promise<string> {
  const COMFYUI_HOST = process.env.COMFYUI_HOST || 'http://localhost:8188'
  const [width, height] = size.split('x').map(Number)
  const clientId = `lc-${Date.now()}`

  // Build a minimal ComfyUI workflow for SDXL txt2img with safety_checker disabled.
  // ComfyUI does not run a safety checker by default — there is no built-in NSFW filter
  // unless the user explicitly adds a `NudeFilter` node, so passing through the default
  // graph is equivalent to safety_checker=false.
  const workflow = {
    prompt: {
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: Math.floor(Math.random() * 1e9),
          steps: 25,
          cfg: 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'sdxl_base_v1.0.safetensors' },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: { width, height, batch_size: 1 },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: { text: prompt, clip: ['4', 1] },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        inputs: { text: negativePrompt || '', clip: ['4', 1] },
      },
      '8': {
        class_type: 'VAEDecode',
        inputs: { samples: ['3', 0], vae: ['4', 2] },
      },
      '9': {
        class_type: 'SaveImage',
        inputs: { images: ['8', 0], filename_prefix: 'LC_GEN' },
      },
    },
    client_id: clientId,
  }

  const queueRes = await fetch(`${COMFYUI_HOST}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  })
  if (!queueRes.ok) {
    const errText = await queueRes.text().catch(() => '')
    throw new Error(`ComfyUI queue failed: ${queueRes.status} ${errText}`)
  }
  const queueData = await queueRes.json()
  const promptId = queueData?.prompt_id
  if (!promptId) throw new Error('ComfyUI returned no prompt_id')

  // Poll for completion (max 90s)
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const statusRes = await fetch(`${COMFYUI_HOST}/history/${promptId}`)
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    const entry = statusData?.[promptId]
    if (entry?.outputs) {
      for (const nodeId of Object.keys(entry.outputs)) {
        const node = entry.outputs[nodeId]
        if (node?.images?.[0]) {
          const img = node.images[0]
          const filename = img.filename
          const subfolder = img.subfolder || ''
          const imgType = img.type || 'output'
          return `${COMFYUI_HOST}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${imgType}`
        }
      }
    }
  }
  throw new Error('ComfyUI job timed out after 90s')
}

// ─── ZAI fallback ───
async function generateViaZai(
  prompt: string,
  negativePrompt: string | undefined,
  size: string
): Promise<string> {
  const ZAIModule = await import('z-ai-web-dev-sdk')
  const ZAI = ZAIModule.default
  const zai = await ZAI.create()

  // The ZAI SDK exposes images.generations.create (not images.generate).
  // Cast through unknown to keep the call site resilient to SDK shape changes.
  const zaiAny = zai as unknown as {
    images: {
      generations: {
        create: (args: {
          prompt: string
          negative_prompt?: string
          size?: string
        }) => Promise<{
          data?: Array<{ url?: string; b64_json?: string }>
        }>
      }
    }
  }
  const response = await zaiAny.images.generations.create({
    prompt,
    negative_prompt: negativePrompt || undefined,
    size,
  })

  const imageUrl = response?.data?.[0]?.url || response?.data?.[0]?.b64_json
  if (!imageUrl) throw new Error('No image returned from the API')

  if (imageUrl.startsWith('http')) return imageUrl
  return `data:image/png;base64,${imageUrl}`
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { prompt, negative_prompt, aspect_ratio } = body as {
      prompt?: string
      negative_prompt?: string
      aspect_ratio?: string
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
    }

    const size = resolveSize(aspect_ratio)
    const cleanPrompt = prompt.trim()
    const cleanNegative = negative_prompt?.trim() || undefined

    // Determine provider — env var presence drives routing.
    const FAL_KEY = process.env.FAL_KEY || ''
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || ''
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || ''
    const COMFYUI_HOST = process.env.COMFYUI_HOST || ''

    let provider = ''
    try {
      if (FAL_KEY) {
        provider = 'fal'
        const image = await generateViaFal(cleanPrompt, cleanNegative, size)
        return NextResponse.json({ image, prompt: cleanPrompt, provider })
      }
      if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
        provider = 'runpod'
        const image = await generateViaRunPod(cleanPrompt, cleanNegative, size)
        return NextResponse.json({ image, prompt: cleanPrompt, provider })
      }
      if (COMFYUI_HOST) {
        provider = 'comfyui'
        const image = await generateViaComfyUI(cleanPrompt, cleanNegative, size)
        return NextResponse.json({ image, prompt: cleanPrompt, provider })
      }
      // Fallback: ZAI SDK (always available, server-side only)
      provider = 'zai'
      const image = await generateViaZai(cleanPrompt, cleanNegative, size)
      return NextResponse.json({ image, prompt: cleanPrompt, provider })
    } catch (sdkErr) {
      console.error(
        `[generate-image] provider=${provider} error:`,
        sdkErr instanceof Error ? sdkErr.message : sdkErr
      )
      // If Fal.ai fails, try RunPod as a secondary fallback before giving up.
      if (provider === 'fal' && RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
        try {
          const image = await generateViaRunPod(cleanPrompt, cleanNegative, size)
          return NextResponse.json({ image, prompt: cleanPrompt, provider: 'runpod-fallback' })
        } catch (err2) {
          console.error('[generate-image] runpod-fallback error:', err2)
        }
      }
      return NextResponse.json(
        {
          error:
            'Image generation failed. Configure FAL_KEY, RUNPOD_API_KEY+RUNPOD_ENDPOINT_ID, COMFYUI_HOST, or ZAI_API_KEY in your environment variables.',
          provider,
          details: sdkErr instanceof Error ? sdkErr.message : 'Unknown error',
        },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[generate-image] error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
