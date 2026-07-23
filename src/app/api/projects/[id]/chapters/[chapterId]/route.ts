import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function ownedChapter(req: NextRequest, projectId: string, chapterId: string) {
  const user = await getCurrentUser(req)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const chapter = await db.projectChapter.findFirst({ where: { id: chapterId, projectId, project: { ownerId: user.id } } })
  if (!chapter) return { error: NextResponse.json({ error: 'Chapter not found' }, { status: 404 }) }
  return { chapter }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; chapterId: string }> }) {
  try {
    const { id, chapterId } = await params
    const access = await ownedChapter(req, id, chapterId)
    if ('error' in access) return access.error
    const body = await req.json().catch(() => ({}))
    const data: { title?: string; content?: string } = {}
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200)
    if (typeof body.content === 'string') data.content = body.content.slice(0, 500000)
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No chapter changes supplied' }, { status: 400 })
    const chapter = await db.projectChapter.update({ where: { id: chapterId }, data })
    return NextResponse.json({ chapter })
  } catch (err) {
    console.error('[project chapter PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; chapterId: string }> }) {
  try {
    const { id, chapterId } = await params
    const access = await ownedChapter(req, id, chapterId)
    if ('error' in access) return access.error
    await db.projectChapter.delete({ where: { id: chapterId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[project chapter DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
