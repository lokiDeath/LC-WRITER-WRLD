import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel') || 'general_writing'
  const since = Number(searchParams.get('since') || '0')
  const messages = await db.communityMessage.findMany({
    where: { channel, createdAt: { gt: new Date(since) } },
    include: { user: { select: { displayName: true, role: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { channel, content } = await req.json().catch(() => ({}))
  if (!channel || !content) return NextResponse.json({ error: 'channel and content required.' }, { status: 400 })
  if (content.length > 4000) return NextResponse.json({ error: 'Message too long.' }, { status: 413 })
  const msg = await db.communityMessage.create({
    data: { channel, content, userId: user.id },
    include: { user: { select: { displayName: true, role: true } } },
  })
  return NextResponse.json({ message: msg })
}
