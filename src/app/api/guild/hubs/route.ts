import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/guild/hubs — list all hubs the current user can see
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hubs = await db.hub.findMany({
      where: {
        OR: [
          { isTheHub: true }, // The Hub is visible to everyone
          { members: { some: { userId: user.id } } },
          { ownerId: user.id },
        ],
        isArchived: false,
      },
      include: {
        members: { where: { userId: user.id } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { displayName: true, loginId: true } } },
        },
      },
      orderBy: [{ isTheHub: 'desc' }, { updatedAt: 'desc' }],
    })

    // Count unread (messages after the user's lastReadAt, or all if no membership)
    const result = hubs.map((hub) => {
      const membership = hub.members[0]
      const lastReadAt = membership?.lastReadAt
      return {
        id: hub.id,
        name: hub.name,
        avatarInitial: hub.avatarInitial,
        isTheHub: hub.isTheHub,
        isArchived: hub.isArchived,
        ownerId: hub.ownerId,
        muted: membership?.muted ?? false,
        pinned: membership?.pinned ?? false,
        favorited: membership?.favorited ?? false,
        lastMessage: hub.messages[0]?.content || '',
        lastSender: hub.messages[0]?.sender?.displayName || '',
        lastTime: hub.messages[0]?.createdAt?.toISOString() || null,
        unread: 0, // computed client-side for simplicity in v1
      }
    })

    return NextResponse.json({ hubs: result })
  } catch (err) {
    console.error('[guild/hubs GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/guild/hubs — create a new hub
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name } = await req.json().catch(() => ({}))
    if (!name?.trim()) return NextResponse.json({ error: 'Hub name required.' }, { status: 400 })

    const hub = await db.hub.create({
      data: {
        name: name.trim(),
        avatarInitial: name.trim().charAt(0).toUpperCase(),
        isTheHub: false,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: 'admin' },
        },
        messages: {
          create: {
            senderId: user.id,
            content: `${name.trim()} was created by ${user.displayName}`,
            isSystemLog: true,
          },
        },
      },
      include: { members: true },
    })

    return NextResponse.json({ hub })
  } catch (err) {
    console.error('[guild/hubs POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
