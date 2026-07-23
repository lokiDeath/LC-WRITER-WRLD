import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function verifyOwner(req: NextRequest, id: string) {
  const user = await getCurrentUser(req)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const project = await db.project.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
  if (!project) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  return { user }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await verifyOwner(req, id)
  if ('error' in access) return access.error
  const chapters = await db.projectChapter.findMany({ where: { projectId: id }, orderBy: { orderIndex: 'asc' } })
  return NextResponse.json({ chapters })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await verifyOwner(req, id)
    if ('error' in access) return access.error
    const body = await req.json().catch(() => ({}))
    const incoming = Array.isArray(body.chapters) ? body.chapters : []
    if (incoming.length === 0 || incoming.length > 100) return NextResponse.json({ error: 'A valid chapter list is required' }, { status: 400 })
    const start = await db.projectChapter.count({ where: { projectId: id } })
    const chapters = await db.$transaction(incoming.map((raw: unknown, index: number) => {
      const chapter = raw as { title?: unknown; content?: unknown }
      return db.projectChapter.create({ data: {
        projectId: id,
        title: typeof chapter.title === 'string' && chapter.title.trim() ? chapter.title.trim().slice(0, 200) : `Chapter ${start + index + 1}`,
        content: typeof chapter.content === 'string' ? chapter.content.slice(0, 500000) : '',
        orderIndex: start + index,
      } })
    }))
    return NextResponse.json({ chapters }, { status: 201 })
  } catch (err) {
    console.error('[project chapters POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
