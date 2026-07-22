import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const listings = await db.tradeListing.findMany({
    where: type ? { type } : {},
    include: { user: { select: { displayName: true, loginId: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ listings })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { title, description, type } = body
  if (!title || !description || !type) return NextResponse.json({ error: 'title, description, type required.' }, { status: 400 })
  const validTypes = ['idea', 'beta_read', 'collab', 'service']
  if (!validTypes.includes(type)) return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
  const listing = await db.tradeListing.create({
    data: { userId: user.id, title, description, type },
    include: { user: { select: { displayName: true, loginId: true } } },
  })
  return NextResponse.json({ listing })
}
