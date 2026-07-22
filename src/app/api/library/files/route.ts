import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/library/files
// Returns the user's library files. Empty array for new accounts.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return an empty list - actual file storage can be wired to
    // Vercel Blob, S3, or filesystem in a future iteration. New users MUST
    // see an empty library.
    return NextResponse.json({
      files: [],
      folders: [],
    })
  } catch (err) {
    console.error('[library/files] error:', err)
    return NextResponse.json({ files: [], folders: [] }, { status: 200 })
  }
}
