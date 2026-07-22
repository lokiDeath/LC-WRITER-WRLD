import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { loginId, password, displayName, email, role, voiceEnabled, ageVerified, hiddenModeUnlocked } = await req.json().catch(() => ({}))
  if (!loginId || !password || !displayName) return NextResponse.json({ error: 'loginId, password, displayName required.' }, { status: 400 })
  const exists = await db.user.findFirst({ where: { loginId } })
  if (exists) return NextResponse.json({ error: 'Login ID already taken.' }, { status: 409 })
  const user = await db.user.create({
    data: { loginId, passwordHash: hashPassword(password), displayName, email: email || null, role: role === 'ADMIN' ? 'ADMIN' : 'CLIENT', voiceEnabled: !!voiceEnabled, ageVerified: !!ageVerified, hiddenModeUnlocked: !!hiddenModeUnlocked },
  })
  await logAudit(admin.id, 'USER_CREATED', `Created ${loginId} (${displayName})`)
  return NextResponse.json({ user: { id: user.id, loginId: user.loginId, displayName: user.displayName, role: user.role } })
}
