import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        displayName: true,
        email: true,
        role: true,
        isBanned: true,
        isSuspended: true,
        voiceEnabled: true,
        ageVerified: true,
        hiddenModeUnlocked: true,
        hiddenModeCode: true,
        ascensionTier: true,
        attunement: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            novels: true,
          },
        },
      },
    })
    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/users GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
