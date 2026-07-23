import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  const types = searchParams.get('types')?.split(',').filter(Boolean) || []
  if (!novelId) return NextResponse.json({ items: [] })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const items = await db.worldElement.findMany({
    where: { novelId, ...(types.length ? { type: { in: types } } : {}) },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, name, type, description, lore, parentId } = body
  if (!novelId || !name || !type) return NextResponse.json({ error: 'novelId, name, type required.' }, { status: 400 })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const item = await db.worldElement.create({
    data: { novelId, name, type, description: description || '', lore: lore || '', parentId: parentId || null, authorId: user.id },
  })
  return NextResponse.json({ item })
}
