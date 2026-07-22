import { db } from '@/lib/db'
import crypto from 'crypto'

const SESSION_COOKIE = 'lc_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ─── Password hashing (PBKDF2 with sha512, 100k iterations) ───
// Works in Node 18+ (Vercel runtime) without native bcrypt dependency.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
    .toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
    .toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

export type SessionUser = {
  id: string
  loginId: string
  displayName: string
  email: string | null
  role: 'ADMIN' | 'CLIENT'
  avatar: string | null
  writingStatus: string
  ascensionTier: number
  attunement: number
  voiceEnabled: boolean
  hiddenModeUnlocked: boolean
  bio: string | null
}

// ─── DB-backed sessions (survive serverless cold starts) ───
export async function getCurrentUser(req: Request): Promise<SessionUser | null> {
  try {
    const token = readSessionToken(req)
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt.getTime() < Date.now()) {
      // Expired — clean up
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    if (session.user.isBanned || session.user.isSuspended) return null

    return {
      id: session.user.id,
      loginId: session.user.loginId,
      displayName: session.user.displayName,
      email: session.user.email,
      role: session.user.role as 'ADMIN' | 'CLIENT',
      avatar: session.user.avatar,
      writingStatus: session.user.writingStatus,
      ascensionTier: session.user.ascensionTier,
      attunement: session.user.attunement,
      voiceEnabled: session.user.voiceEnabled,
      hiddenModeUnlocked: session.user.hiddenModeUnlocked,
      bio: session.user.bio,
    }
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({
    data: { userId, token, expiresAt },
  })
  return token
}

export async function destroySession(req: Request): Promise<void> {
  try {
    const token = readSessionToken(req)
    if (!token) return
    await db.session.deleteMany({ where: { token } })
  } catch {
    // best-effort
  }
}

export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  return cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=').slice(1).join('=') || null
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function getSessionMaxAge(): number {
  return SESSION_TTL_MS / 1000 // seconds
}

export async function logAudit(
  actorId: string | null,
  action: string,
  detail?: string
) {
  try {
    await db.auditLog.create({ data: { actorId, action, detail } })
  } catch {
    // best-effort
  }
}
