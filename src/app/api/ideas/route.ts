import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  const items = await db.idea.findMany({
    where: { userId: user.id, ...(novelId ? { novelId } : {}) },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, title, content, category } = body
  if (!title) return NextResponse.json({ error: 'title required.' }, { status: 400 })
  const item = await db.idea.create({
    data: { userId: user.id, novelId: novelId || null, title, content: content || '', category: category || 'scene' },
  })
  return NextResponse.json({ item })
}
