import { NextResponse } from 'next/server'

// GET /api/auth/oauth/discord
// Initiates Discord OAuth. Falls back gracefully when not configured.
export async function GET() {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID || ''
    const redirectUri = process.env.DISCORD_REDIRECT_URI || ''

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        {
          error:
            'Discord OAuth is not configured on this server. Please sign in with username and passphrase.',
        },
        { status: 503 }
      )
    }

    const scope = encodeURIComponent('identify email')
    const state = Math.random().toString(36).slice(2)
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`

    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('[oauth/discord] error:', err)
    return NextResponse.json(
      { error: 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}
