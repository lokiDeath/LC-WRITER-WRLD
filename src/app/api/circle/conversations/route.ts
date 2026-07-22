import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/circle/conversations — list conversations for the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const memberships = await db.conversationMember.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, displayName: true, loginId: true, avatar: true, writingStatus: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { displayName: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })

    const result = memberships.map((m) => {
      const otherMember = m.conversation.members.find((mm) => mm.userId !== user.id)
      const other = otherMember?.user
      const lastMsg = m.conversation.messages[0]
      return {
        id: m.conversation.id,
        isArchived: m.conversation.isArchived,
        isPinned: m.conversation.isPinned,
        otherUser: other
          ? {
              id: other.id,
              displayName: other.displayName,
              username: other.loginId,
              avatar: other.avatar,
              avatarInitial: other.displayName.charAt(0).toUpperCase(),
              writingStatus: other.writingStatus,
            }
          : null,
        lastMessage: lastMsg?.content || '',
        lastTime: lastMsg?.createdAt?.toISOString() || null,
        lastSenderName: lastMsg?.sender?.displayName || '',
        receipt: lastMsg?.receipt || null,
        unread: 0, // computed client-side in v1
      }
    })

    return NextResponse.json({ conversations: result })
  } catch (err) {
    console.error('[circle/conversations GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/circle/conversations — start a new DM with a target user
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetUserId, targetUsername } = await req.json().catch(() => ({}))
    if (!targetUserId && !targetUsername) {
      return NextResponse.json({ error: 'Target user required.' }, { status: 400 })
    }

    const target = targetUserId
      ? await db.user.findUnique({ where: { id: targetUserId } })
      : await db.user.findFirst({ where: { loginId: { equals: targetUsername, mode: 'insensitive' } } })

    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.id === user.id) return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 })

    // Look for an existing conversation between these two users
    const existing = await db.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: target.id } } },
        ],
      },
      include: { members: true },
    })

    if (existing) {
      return NextResponse.json({ conversationId: existing.id, existed: true })
    }

    // Create new conversation
    const conv = await db.conversation.create({
      data: {
        members: {
          create: [{ userId: user.id }, { userId: target.id }],
        },
      },
    })

    return NextResponse.json({ conversationId: conv.id, existed: false })
  } catch (err) {
    console.error('[circle/conversations POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
