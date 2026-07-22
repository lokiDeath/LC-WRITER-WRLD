import { NextRequest, NextResponse } from 'next/server'
import { destroySession, getSessionCookieName, logAudit, getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (user) {
      await logAudit(user.id, 'LOGOUT', `${user.loginId} signed out`)
    }
    await destroySession(req)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(getSessionCookieName(), '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (err) {
    console.error('[auth/logout] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
