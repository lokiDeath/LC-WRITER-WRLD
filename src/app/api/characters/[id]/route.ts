import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.character.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const allowed = ['name','alias','role','age','birthday','race','cultivation','powerLevel','occupation','appearance','height','weight','hair','eyes','voice','accent','personality','likes','dislikes','habits','goals','secrets','background','abilities','qi','mana','aether','arc','quotes','inventory','skills','magic','notes','portraitUrl']
  const data: any = {}
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
  const updated = await db.character.update({ where: { id }, data })
  return NextResponse.json({ character: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await db.character.findUnique({ where: { id } })
  if (!existing || existing.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.character.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
