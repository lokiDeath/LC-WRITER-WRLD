import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/guild/hubs/[id] — fetch one hub + paginated messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const url = new URL(req.url)
    const cursor = url.searchParams.get('cursor')
    const take = Math.min(50, Number(url.searchParams.get('limit') || 50))

    const hub = await db.hub.findUnique({ where: { id } })
    if (!hub) return NextResponse.json({ error: 'Hub not found' }, { status: 404 })

    const messages = await db.hubMessage.findMany({
      where: { hubId: id },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: {
          select: { id: true, displayName: true, loginId: true, avatar: true },
        },
        reactions: true,
        replyTo: { include: { sender: { select: { displayName: true } } } },
      },
    })

    const hasMore = messages.length > take
    const items = hasMore ? messages.slice(0, take) : messages
    const nextCursor = hasMore ? items[items.length - 1].id : null

    // Reverse so oldest is first (for chat display)
    items.reverse()

    // Update lastReadAt for the current user
    await db.hubMember.upsert({
      where: { hubId_userId: { hubId: id, userId: user.id } },
      update: { lastReadAt: new Date() },
      create: { hubId: id, userId: user.id, lastReadAt: new Date() },
    }).catch(() => {})

    return NextResponse.json({
      hub: {
        id: hub.id,
        name: hub.name,
        avatarInitial: hub.avatarInitial,
        isTheHub: hub.isTheHub,
        ownerId: hub.ownerId,
      },
      messages: items,
      nextCursor,
    })
  } catch (err) {
    console.error('[guild/hubs/[id] GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/guild/hubs/[id] — send a message to a hub
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { content, replyToId, attachmentName, attachmentType, attachmentUrl } = body
    if (!content?.trim() && !attachmentName) {
      return NextResponse.json({ error: 'Message content required.' }, { status: 400 })
    }

    const hub = await db.hub.findUnique({ where: { id } })
    if (!hub) return NextResponse.json({ error: 'Hub not found' }, { status: 404 })

    // Ensure user is a member
    await db.hubMember.upsert({
      where: { hubId_userId: { hubId: id, userId: user.id } },
      update: {},
      create: { hubId: id, userId: user.id },
    })

    const msg = await db.hubMessage.create({
      data: {
        hubId: id,
        senderId: user.id,
        content: content?.trim() || '',
        replyToId: replyToId || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        sender: { select: { id: true, displayName: true, loginId: true, avatar: true } },
      },
    })

    // Bump hub updatedAt so it sorts to the top of the list
    await db.hub.update({ where: { id }, data: { updatedAt: new Date() } })

    return NextResponse.json({ message: msg })
  } catch (err) {
    console.error('[guild/hubs/[id] POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
