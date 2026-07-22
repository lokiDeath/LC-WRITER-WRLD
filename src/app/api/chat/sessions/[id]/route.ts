import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const existing = await db.chatSession.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    const body = await req.json().catch(() => ({}))
    const { title, aiPersonality } = body
    const updated = await db.chatSession.update({
      where: { id },
      data: { ...(title !== undefined && { title }), ...(aiPersonality !== undefined && { aiPersonality }) },
    })
    return NextResponse.json({ session: updated })
  } catch (err) {
    console.error('[chat/sessions/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const existing = await db.chatSession.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    await db.chatSession.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[chat/sessions/[id] DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
