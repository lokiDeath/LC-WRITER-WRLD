import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.idea.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { title, content, category } = body
  const updated = await db.idea.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(category !== undefined && { category }) },
  })
  return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[ideas:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.idea.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.idea.delete({ where: { id } })
  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ideas:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
