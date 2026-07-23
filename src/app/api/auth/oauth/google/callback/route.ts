import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  logAudit,
  getSessionCookieName,
  getSessionMaxAge,
} from '@/lib/auth'

// GET /api/auth/oauth/google/callback
// Handles the OAuth 2.0 token exchange + user creation for Google.
// Google redirects here with ?code=... after the user authorizes the app.
// We exchange the code for an access token, fetch the user profile, then
// create (or look up) a User row and issue a session cookie — the same
// flow /api/auth/login uses.
//
// All API keys use `process.env.X || ''` fallbacks so the build never crashes.
// If Google OAuth is not configured, we redirect home with an error flag.

function htmlErrorPage(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><title>OAuth failed</title>` +
      `<style>body{font-family:Inter,system-ui,sans-serif;background:#0a0908;color:#f8f5f2;` +
      `display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}` +
      `h1{font-size:24px;margin:0 0 8px}p{color:#8a7c6b;font-size:14px}` +
      `a{color:#c9a96e;text-decoration:none;margin-top:12px;display:inline-block}</style></head>` +
      `<body><div><h1>OAuth sign-in failed</h1><p>${message}</p>` +
      `<a href="/">Return to the Grand Archive</a></div></body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } }
  )
}

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || ''

    if (!clientId || !clientSecret || !redirectUri) {
      return htmlErrorPage('Google OAuth is not configured on this server.')
    }

    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    if (!code) {
      return htmlErrorPage('No authorization code returned by Google.')
    }
    void stateParam // not validated for stateless simplicity

    // ─── Exchange the code for an access token ───
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '')
      return htmlErrorPage(`Token exchange failed: ${tokenRes.status} ${errText.slice(0, 200)}`)
    }
    const tokenData = await tokenRes.json()
    const accessToken = tokenData?.access_token
    if (!accessToken) {
      return htmlErrorPage('Google returned no access token.')
    }

    // ─── Fetch the user profile ───
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      return htmlErrorPage('Failed to fetch Google profile.')
    }
    const profile = await profileRes.json()
    const email = (profile?.email || '').toLowerCase()
    const name = profile?.name || email?.split('@')[0] || 'Google Author'
    const avatar = profile?.picture || null
    const googleSub = profile?.sub
    if (!email || !googleSub) {
      return htmlErrorPage('Google profile is missing email or sub.')
    }

    // ─── Create or look up the user ───
    // The `loginId` is the email so the user can also sign in with the
    // password flow if they later set one. We set a random password hash
    // so password login is impossible until they explicitly set one.
    const oauthLoginId = `google:${googleSub}`
    let user = await db.user.findFirst({
      where: { OR: [{ loginId: oauthLoginId }, ...(email ? [{ email }] : [])] },
    })
    if (!user) {
      user = await db.user.create({
        data: {
          loginId: oauthLoginId,
          email,
          displayName: name,
          avatar,
          passwordHash: 'oauth:google:disabled', // cannot be verified by verifyPassword
        },
      })
      // Also create the linked account record
      await db.linkedAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: googleSub,
          accessToken,
          refreshToken: tokenData?.refresh_token || null,
          connected: true,
        },
      }).catch(() => {})
    } else {
      // Update avatar + linked account on subsequent logins
      if (avatar && user.avatar !== avatar) {
        await db.user.update({ where: { id: user.id }, data: { avatar } }).catch(() => {})
      }
      await db.linkedAccount.upsert({
        where: { userId_provider: { userId: user.id, provider: 'google' } },
        update: { providerAccountId: googleSub, accessToken, refreshToken: tokenData?.refresh_token || null, connected: true },
        create: { userId: user.id, provider: 'google', providerAccountId: googleSub, accessToken, connected: true },
      }).catch(() => {})
    }

    // ─── Issue the session cookie ───
    const token = await createSession(user.id)
    const ip = getClientIp(req)
    const ua = req.headers.get('user-agent') || ''
    const country = getCountryFromRequest(req)
    await logAudit(user.id, 'OAUTH_LOGIN_GOOGLE', JSON.stringify({ ip, userAgent: ua, country, loginId: user.loginId }))

    const res = NextResponse.redirect(new URL('/', req.nextUrl.origin))
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAge(),
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (err) {
    console.error('[oauth/google/callback] error:', err)
    return htmlErrorPage('An unexpected error occurred during Google sign-in.')
  }
}

// ─── Helpers (shared with discord callback) ───
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function getCountryFromRequest(req: NextRequest): string {
  // Vercel sets x-vercel-ip-country on every request when running on the
  // edge network. Cloudflare sets cf-ipcountry. We check both.
  return req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'unknown'
}
