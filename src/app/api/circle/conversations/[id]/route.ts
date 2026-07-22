import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/circle/conversations/[id] — fetch a conversation + messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const url = new URL(req.url)
    const cursor = url.searchParams.get('cursor')
    const take = Math.min(100, Number(url.searchParams.get('limit') || 100))

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
      include: { conversation: { include: { members: { include: { user: { select: { id: true, displayName: true, loginId: true, avatar: true, writingStatus: true } } } } } } },
    })
    if (!membership) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const messages = await db.directMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        reactions: true,
        replyTo: { include: { sender: { select: { displayName: true } } } },
      },
    })

    const hasMore = messages.length > take
    const items = hasMore ? messages.slice(0, take) : messages
    const nextCursor = hasMore ? items[items.length - 1].id : null
    items.reverse()

    // Update lastReadAt
    await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
    }).catch(() => {})

    // Mark inbound messages as read
    await db.directMessage.updateMany({
      where: { conversationId: id, senderId: { not: user.id }, receipt: { not: 'read' } },
      data: { receipt: 'read' },
    }).catch(() => {})

    const otherMember = membership.conversation.members.find((m) => m.userId !== user.id)
    const otherUser = otherMember?.user

    return NextResponse.json({
      conversation: {
        id: membership.conversation.id,
        isArchived: membership.conversation.isArchived,
        isPinned: membership.conversation.isPinned,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              displayName: otherUser.displayName,
              username: otherUser.loginId,
              avatar: otherUser.avatar,
              avatarInitial: otherUser.displayName.charAt(0).toUpperCase(),
              writingStatus: otherUser.writingStatus,
            }
          : null,
      },
      messages: items,
      nextCursor,
    })
  } catch (err) {
    console.error('[circle/conversations/[id] GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/circle/conversations/[id] — send a DM
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

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const msg = await db.directMessage.create({
      data: {
        conversationId: id,
        senderId: user.id,
        content: content?.trim() || '',
        replyToId: replyToId || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        attachmentUrl: attachmentUrl || null,
        receipt: 'sent',
      },
    })

    // Bump conversation updatedAt
    await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

    // Mark the message as delivered — fire-and-forget without setTimeout (Vercel kills background timers)
    db.directMessage.update({ where: { id: msg.id }, data: { receipt: 'delivered' } }).catch(() => {})

    return NextResponse.json({ message: msg })
  } catch (err) {
    console.error('[circle/conversations/[id] POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/circle/conversations/[id] — archive / pin / mute
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action } = body as { action: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'favorite' | 'unfavorite' }

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const patch: Record<string, boolean> = {}
    if (action === 'archive' || action === 'unarchive') patch.muted = action === 'archive' ? membership.muted : membership.muted
    if (action === 'mute') patch.muted = true
    if (action === 'unmute') patch.muted = false
    if (action === 'favorite') patch.favorited = true
    if (action === 'unfavorite') patch.favorited = false

    // Pin / archive are conversation-level
    if (action === 'archive') await db.conversation.update({ where: { id }, data: { isArchived: true } })
    if (action === 'unarchive') await db.conversation.update({ where: { id }, data: { isArchived: false } })
    if (action === 'pin') await db.conversation.update({ where: { id }, data: { isPinned: true } })
    if (action === 'unpin') await db.conversation.update({ where: { id }, data: { isPinned: false } })

    if (Object.keys(patch).length > 0) {
      await db.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: user.id } },
        data: patch,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[circle/conversations/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
