import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.magicElement.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { name, type, energyCost, weaknesses, strengths, combinations, restrictions, description } = body
  const updated = await db.magicElement.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(type !== undefined && { type }), ...(energyCost !== undefined && { energyCost }), ...(weaknesses !== undefined && { weaknesses }), ...(strengths !== undefined && { strengths }), ...(combinations !== undefined && { combinations }), ...(restrictions !== undefined && { restrictions }), ...(description !== undefined && { description }) },
  })
  return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[magic:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.magicElement.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.magicElement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[magic:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
