import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'

export async function GET(req: NextRequest) {
  try {
    await ensureSeed()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    // Fetch linked accounts so the Settings modal can show real OAuth status.
    let linkedAccounts: { provider: string; username?: string }[] = []
    try {
      const rows = await db.linkedAccount.findMany({
        where: { userId: user.id, connected: true },
        select: { provider: true, providerAccountId: true },
      })
      linkedAccounts = rows.map((r) => ({
        provider: r.provider,
        username: r.providerAccountId || undefined,
      }))
    } catch {
      // ignore - LinkedAccount table may not be provisioned yet
    }
    return NextResponse.json({ user: { ...user, linkedAccounts } })
  } catch (err) {
    console.error('[auth/me] error:', err)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
