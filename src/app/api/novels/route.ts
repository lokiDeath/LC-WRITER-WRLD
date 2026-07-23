import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const novels = await db.novel.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { chapters: true, characters: true } } },
  })
  return NextResponse.json({
    novels: novels.map((n) => ({ ...n, chapterCount: n._count.chapters })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { title, description, genre } = body
  if (!title) return NextResponse.json({ error: 'Title required.' }, { status: 400 })
  const created = await db.novel.create({
    data: { title, description: description || '', genre: genre || null, authorId: user.id },
  })
  return NextResponse.json({ novel: created })
}
