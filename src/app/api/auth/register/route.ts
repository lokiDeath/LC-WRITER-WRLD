import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, getSessionCookieName, getSessionMaxAge, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { loginId, password, displayName, email } = await req.json().catch(() => ({}))
    if (!loginId || !password || !displayName) {
      return NextResponse.json({ error: 'Username, password, and display name are required.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    if (loginId.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 })
    }

    const whereClauses: any[] = [
      { loginId: { equals: loginId, mode: 'insensitive' } },
    ]
    if (email) whereClauses.push({ email: { equals: email, mode: 'insensitive' } })
    const existing = await db.user.findFirst({ where: { OR: whereClauses } })
    if (existing) {
      return NextResponse.json({ error: 'Username or email already in use.' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        loginId,
        passwordHash: hashPassword(password),
        displayName,
        email: email || null,
        role: 'CLIENT',
      },
    })

    // Provision default settings
    await db.userSettings.create({ data: { userId: user.id } })

    const token = await createSession(user.id)
    await logAudit(user.id, 'REGISTER', `${user.loginId} registered`)

    const sessionUser = {
      id: user.id,
      loginId: user.loginId,
      displayName: user.displayName,
      email: user.email,
      role: user.role as 'ADMIN' | 'CLIENT',
      avatar: user.avatar,
      writingStatus: user.writingStatus,
      ascensionTier: user.ascensionTier,
      attunement: user.attunement,
      voiceEnabled: user.voiceEnabled,
      hiddenModeUnlocked: user.hiddenModeUnlocked,
      bio: user.bio,
    }

    const res = NextResponse.json({ user: sessionUser })
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAge(),
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (err) {
    console.error('[auth/register] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
