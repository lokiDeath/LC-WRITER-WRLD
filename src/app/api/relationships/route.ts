import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  if (!novelId) return NextResponse.json({ relationships: [] })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const relationships = await db.relationship.findMany({ where: { novelId } })
  return NextResponse.json({ relationships })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, fromCharacterId, toCharacterId, type, description } = body
  if (!novelId || !fromCharacterId || !toCharacterId || !type) return NextResponse.json({ error: 'novelId, fromCharacterId, toCharacterId, type required.' }, { status: 400 })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const chars = await db.character.findMany({ where: { id: { in: [fromCharacterId, toCharacterId] }, authorId: user.id } })
  if (chars.length !== 2) return NextResponse.json({ error: 'Characters not found.' }, { status: 404 })
  const item = await db.relationship.create({
    data: { novelId, fromCharacterId, toCharacterId, type, description: description || '', authorId: user.id },
  })
  return NextResponse.json({ item })
}
