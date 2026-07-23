import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/admin/users/[id]/login-info
// Returns the most-recent login audit entry for a user, parsed into
// structured fields: { ip, country, userAgent, deviceLabel, at }.
// Used by the Admin Overseer Inspector Drawer to surface REAL IP +
// country tracking (not the admin's own device UA).

type ParsedLoginMeta = {
  ip?: string
  userAgent?: string
  country?: string
  loginId?: string
}

function parseDevice(ua: string): string {
  if (!ua) return 'Unknown'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac\sos/i.test(ua) || (/macintosh/i.test(ua) && !/iphone|ipad/i.test(ua))) return 'macOS'
  if (/iphone|ipad/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Other'
}

function parseBrowser(ua: string): string {
  if (!ua) return 'Unknown'
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  if (/firefox/i.test(ua)) return 'Firefox'
  return 'Other'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser(req)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const { id } = await params

    // Find the most-recent LOGIN or OAUTH_LOGIN_* audit entry for this user.
    // The detail field stores a JSON blob with ip/userAgent/country/loginId.
    const logs = await db.auditLog.findMany({
      where: {
        actorId: id,
        action: { in: ['LOGIN', 'OAUTH_LOGIN_GOOGLE', 'OAUTH_LOGIN_DISCORD'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    const latest = logs[0]
    if (!latest) {
      return NextResponse.json({ loginInfo: null })
    }
    let parsed: ParsedLoginMeta = {}
    try {
      parsed = JSON.parse(latest.detail || '{}') as ParsedLoginMeta
    } catch {
      // older entries stored a plain string — leave parsed empty
    }
    return NextResponse.json({
      loginInfo: {
        at: latest.createdAt,
        action: latest.action,
        ip: parsed.ip || 'unknown',
        country: parsed.country || 'unknown',
        userAgent: parsed.userAgent || '',
        device: parseDevice(parsed.userAgent || ''),
        browser: parseBrowser(parsed.userAgent || ''),
        loginId: parsed.loginId || '',
      },
    })
  } catch (err) {
    console.error('[admin/users/[id]/login-info] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
