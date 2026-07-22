import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  if (!novelId) return NextResponse.json({ items: [] })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const items = await db.cultivationRealm.findMany({ where: { novelId }, orderBy: { stage: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, name, stage, requirements, breakthroughConditions, failureChance, energyType, description, orderIndex } = body
  if (!novelId || !name) return NextResponse.json({ error: 'novelId, name required.' }, { status: 400 })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const item = await db.cultivationRealm.create({
    data: { novelId, name, stage: stage || 0, requirements: requirements || '', breakthroughConditions: breakthroughConditions || '', failureChance: failureChance || 0, energyType: energyType || 'Qi', description: description || '', orderIndex: orderIndex || 0, authorId: user.id },
  })
  return NextResponse.json({ item })
}
