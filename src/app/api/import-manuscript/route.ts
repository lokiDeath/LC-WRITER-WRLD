import { NextRequest, NextResponse } from 'next/server'

// Alias route that re-exports the studio/import handler.
// The spec explicitly mentions /api/import-manuscript; this keeps both
// paths available so existing clients and new ones both work.
export async function POST(req: NextRequest) {
  try {
    const { POST: studioImport } = await import('@/app/api/studio/import/route')
    return studioImport(req)
  } catch (err) {
    console.error('[import-manuscript] error:', err)
    return NextResponse.json({ error: 'Import failed.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/import-manuscript',
    methods: ['POST'],
    accepts: 'multipart/form-data with file (or url), projectName',
  })
}
