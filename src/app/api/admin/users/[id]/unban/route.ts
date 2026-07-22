import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { id } = await params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const updated = await db.user.update({ where: { id }, data: { isBanned: false } })
  await logAudit(admin.id, 'USER_UNBAN', target.loginId)
  return NextResponse.json({ user: updated })
}
