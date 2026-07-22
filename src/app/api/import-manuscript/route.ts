import { NextRequest, NextResponse } from 'next/server'

// Alias route that re-exports the studio/import handler.
// The spec explicitly mentions /api/import-manuscript; this keeps both
// paths available so existing clients and new ones both work.
export async function POST(req: NextRequest) {
  const { POST: studioImport } = await import('@/app/api/studio/import/route')
  return studioImport(req)
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/import-manuscript',
    methods: ['POST'],
    accepts: 'multipart/form-data with file (or url), projectName',
  })
}
