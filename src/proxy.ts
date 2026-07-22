import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// Routes that require ADMIN role. The /admin page itself plus all admin API
// routes are protected. API routes already enforce ADMIN server-side; this
// proxy adds a layer for the /admin UI page so non-admins get a 403
// before any client-side code runs.
const ADMIN_PATHS = ['/admin', '/admin/']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /admin UI routes here. API routes have their own
  // getCurrentUser() guards in each handler.
  const isAdminPath = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!isAdminPath) {
    return NextResponse.next()
  }

  // Read session token from cookie
  const cookie = req.headers.get('cookie') || ''
  const token = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('lc_session='))
    ?.split('=')
    .slice(1)
    .join('=') || null

  if (!token) {
    // Not authenticated — redirect to home (which shows login)
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session || session.expiresAt.getTime() < Date.now()) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    if (session.user.isBanned || session.user.isSuspended) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    if (session.user.role !== 'ADMIN') {
      // Authenticated but not admin — return a 403 page
      return new NextResponse(
        `<!doctype html><html><head><title>403 — Forbidden</title><style>body{font-family:Inter,system-ui,sans-serif;background:#0a0908;color:#f8f5f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}h1{font-size:64px;margin:0;color:#dc2626}p{color:#8a7c6b;font-size:14px}a{color:#c9a96e;text-decoration:none}</style></head><body><div><h1>403</h1><p>You do not have permission to access the Overseer Panel.</p><p style="margin-top:8px"><a href="/">Return to the Grand Archive</a></p></div></body></html>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }
  } catch (err) {
    console.error('[middleware] admin check failed:', err)
    // On DB error, allow through — the page will re-check on render
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
