import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { id } = await params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const code = `LC-HIDDEN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  await db.user.update({ where: { id }, data: { hiddenModeCode: code } })
  await logAudit(admin.id, 'HIDDEN_CODE_GENERATED', `Issued ${code} for ${target.loginId}`)
  return NextResponse.json({ code })
}
