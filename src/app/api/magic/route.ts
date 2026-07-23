import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  if (!novelId) return NextResponse.json({ items: [] })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const items = await db.magicElement.findMany({ where: { novelId }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ items })
  } catch (err) {
    console.error('[magic] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, name, type, energyCost, weaknesses, strengths, combinations, restrictions, description } = body
  if (!novelId || !name) return NextResponse.json({ error: 'novelId, name required.' }, { status: 400 })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const item = await db.magicElement.create({
    data: { novelId, name, type: type || 'Fire', energyCost: energyCost || '', weaknesses: weaknesses || '', strengths: strengths || '', combinations: combinations || '', restrictions: restrictions || '', description: description || '', authorId: user.id },
  })
  return NextResponse.json({ item })
  } catch (err) {
    console.error('[magic] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
