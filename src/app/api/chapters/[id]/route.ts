import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const chapter = await db.chapter.findUnique({ where: { id }, include: { novel: true } })
  if (!chapter || chapter.novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const { title, content, status, pov, arc, notes } = body
  const wordCount = content ? content.trim().split(/\s+/).length : chapter.wordCount
  const updated = await db.chapter.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content, wordCount }),
      ...(status !== undefined && { status }),
      ...(pov !== undefined && { pov }),
      ...(arc !== undefined && { arc }),
      ...(notes !== undefined && { notes }),
    },
  })
  const allChapters = await db.chapter.findMany({ where: { novelId: chapter.novelId }, select: { wordCount: true } })
  const totalWords = allChapters.reduce((s, c) => s + c.wordCount, 0)
  await db.novel.update({ where: { id: chapter.novelId }, data: { wordCount: totalWords } })
  return NextResponse.json({ chapter: updated })
  } catch (err) {
    console.error('[chapters:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const chapter = await db.chapter.findUnique({ where: { id }, include: { novel: true } })
  if (!chapter || chapter.novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  await db.chapter.delete({ where: { id } })
  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[chapters:[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
