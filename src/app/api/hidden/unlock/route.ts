import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { code } = await req.json().catch(() => ({}))
    if (!code) return NextResponse.json({ error: 'Access code required.' }, { status: 400 })
    const fresh = await db.user.findUnique({ where: { id: user.id } })
    if (!fresh) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    if (!fresh.hiddenModeCode || fresh.hiddenModeCode !== code) return NextResponse.json({ error: 'Invalid secret code.' }, { status: 400 })
    await db.user.update({ where: { id: user.id }, data: { hiddenModeUnlocked: true } })
    await logAudit(user.id, 'HIDDEN_UNLOCKED', `${user.loginId} unlocked Hidden Mode`)
    return NextResponse.json({ unlocked: true })
  } catch (err) {
    console.error('[hidden/unlock POST] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
