import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.foreshadow.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { clue, introducedInChapter, paidOff, paidOffInChapter, status, notes } = body
  const updated = await db.foreshadow.update({
    where: { id },
    data: { ...(clue !== undefined && { clue }), ...(introducedInChapter !== undefined && { introducedInChapter: introducedInChapter || null }), ...(paidOff !== undefined && { paidOff }), ...(paidOffInChapter !== undefined && { paidOffInChapter: paidOffInChapter || null }), ...(status !== undefined && { status }), ...(notes !== undefined && { notes }) },
  })
  return NextResponse.json({ item: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.foreshadow.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.foreshadow.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
