import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/library/delete
// Body: { ids: string[] }
// Acknowledges deletion of the given file IDs.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : []

    // In production, delete from storage here.
    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    console.error('[library/delete] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
