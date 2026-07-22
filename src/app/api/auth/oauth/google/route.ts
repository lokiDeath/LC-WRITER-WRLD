import { NextResponse } from 'next/server'

// GET /api/auth/oauth/google
// Initiates Google OAuth. If GOOGLE_CLIENT_ID is not configured, returns a
// user-friendly error so the build never crashes.
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || ''

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        {
          error:
            'Google OAuth is not configured on this server. Please sign in with username and passphrase.',
        },
        { status: 503 }
      )
    }

    const scope = encodeURIComponent('openid email profile')
    const state = Math.random().toString(36).slice(2)
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`

    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('[oauth/google] error:', err)
    return NextResponse.json(
      { error: 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}
