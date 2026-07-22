import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/library/upload
// Accepts a file via FormData and returns the file metadata.
// In a production deployment this would push to Vercel Blob / S3 / Cloudinary.
// Here we return the metadata so the UI can immediately reflect the upload.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine file type
    const isImage = file.type.startsWith('image/')
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const sizeKb = Math.max(1, Math.round(file.size / 1024))
    const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

    // In production, push to storage here. For now, we return metadata only.
    // This keeps the build stable on Vercel without external storage config.
    const fileMeta = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      modified: 'Just now',
      size: sizeLabel,
      type: isImage ? 'image' : 'file',
      ext,
    }

    return NextResponse.json({ file: fileMeta })
  } catch (err) {
    console.error('[library/upload] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
