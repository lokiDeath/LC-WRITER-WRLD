import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.tradeListing.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { title, description, type, status } = body
  const validStatuses = ['open', 'in_progress', 'completed', 'closed']
  if (status && !validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  const updated = await db.tradeListing.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(description !== undefined && { description }), ...(type !== undefined && { type }), ...(status !== undefined && { status }) },
  })
  return NextResponse.json({ listing: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.tradeListing.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.tradeListing.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
