import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const novel = await db.novel.findUnique({ where: { id } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { title, orderIndex, pov, arc } = body
  if (!title) return NextResponse.json({ error: 'title required.' }, { status: 400 })
  const chapter = await db.chapter.create({
    data: { novelId: id, title, orderIndex: orderIndex ?? 0, pov: pov || null, arc: arc || null },
  })
  return NextResponse.json({ chapter })
}
