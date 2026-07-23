import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.worldElement.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { name, type, description, lore, parentId } = body
  const updated = await db.worldElement.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(type !== undefined && { type }), ...(description !== undefined && { description }), ...(lore !== undefined && { lore }), ...(parentId !== undefined && { parentId: parentId || null }) },
  })
  return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[world:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.worldElement.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.worldElement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[world:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
