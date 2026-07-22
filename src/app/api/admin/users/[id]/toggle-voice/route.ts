import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser(req)
    if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    const updated = await db.user.update({ where: { id }, data: { voiceEnabled: !!body.enabled } })
    await logAudit(admin.id, 'VOICE_TOGGLED', `${target.loginId} -> ${body.enabled ? 'ON' : 'OFF'}`)
    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('[admin/users/[id]/toggle-voice POST] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
