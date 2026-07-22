import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { id } = await params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (target.id === admin.id) return NextResponse.json({ error: 'Cannot delete yourself.' }, { status: 400 })
  await db.user.delete({ where: { id } })
  await logAudit(admin.id, 'USER_DELETED', `${target.loginId}`)
  return NextResponse.json({ ok: true })
}
