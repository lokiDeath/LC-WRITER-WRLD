import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.cultivationRealm.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { name, stage, requirements, breakthroughConditions, failureChance, energyType, description } = body
  const updated = await db.cultivationRealm.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(stage !== undefined && { stage }), ...(requirements !== undefined && { requirements }), ...(breakthroughConditions !== undefined && { breakthroughConditions }), ...(failureChance !== undefined && { failureChance }), ...(energyType !== undefined && { energyType }), ...(description !== undefined && { description }) },
  })
  return NextResponse.json({ item: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.cultivationRealm.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.cultivationRealm.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
