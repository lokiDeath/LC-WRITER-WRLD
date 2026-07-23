import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  createSession,
  logAudit,
  getSessionCookieName,
  getSessionMaxAge,
} from '@/lib/auth'
import { ensureSeed } from '@/lib/seed'

export async function POST(req: NextRequest) {
  try {
    await ensureSeed()
    const { loginId, password } = await req.json().catch(() => ({}))
    if (!loginId || !password) {
      return NextResponse.json(
        { error: 'Login ID and password required.' },
        { status: 400 }
      )
    }

    const user = await db.user.findFirst({
      where: { loginId: { equals: loginId, mode: 'insensitive' } },
    })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      )
    }
    if (user.isBanned) {
      return NextResponse.json({ error: 'Account banned.' }, { status: 403 })
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: 'Account suspended.' }, { status: 403 })
    }

    const token = await createSession(user.id)
    // ─── Log the user's IP / User-Agent / Country for the Admin Overseer ───
    // Vercel sets x-forwarded-for + x-vercel-ip-country on every request.
    // Cloudflare sets cf-ipcountry. We capture all three so the admin can
    // surface them in the Inspector Drawer.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = req.headers.get('user-agent') || ''
    const country = req.headers.get('x-vercel-ip-country')
      || req.headers.get('cf-ipcountry')
      || 'unknown'
    await logAudit(
      user.id,
      'LOGIN',
      JSON.stringify({ ip, userAgent, country, loginId: user.loginId })
    )

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
    console.error('[auth/login] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
