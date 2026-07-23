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
  const items = await db.timelineEvent.findMany({ where: { novelId }, orderBy: { orderIndex: 'asc' } })
  return NextResponse.json({ items })
  } catch (err) {
    console.error('[timeline] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId, year, month, day, hour, event, charactersPresent, location, itemsUsed, weather, deaths, births, notes, orderIndex } = body
  if (!novelId || !event) return NextResponse.json({ error: 'novelId, event required.' }, { status: 400 })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const item = await db.timelineEvent.create({
    data: { novelId, year: year || '', month: month || '', day: day || '', hour: hour || '', event, charactersPresent: charactersPresent || '', location: location || '', itemsUsed: itemsUsed || '', weather: weather || '', deaths: deaths || '', births: births || '', notes: notes || '', orderIndex: orderIndex || 0, authorId: user.id },
  })
  return NextResponse.json({ item })
  } catch (err) {
    console.error('[timeline] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
