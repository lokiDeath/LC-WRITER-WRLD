import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// PATCH /api/circle/messages/[id] — star, react, delete
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action, emoji } = body as { action: 'star' | 'unstar' | 'react' | 'unreact' | 'delete'; emoji?: string }

    const msg = await db.directMessage.findUnique({ where: { id } })
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (action === 'star' || action === 'unstar') {
      const updated = await db.directMessage.update({ where: { id }, data: { isStarred: action === 'star' } })
      return NextResponse.json({ message: updated })
    }

    if (action === 'react' || action === 'unreact') {
      if (!emoji) return NextResponse.json({ error: 'Emoji required' }, { status: 400 })
      if (action === 'react') {
        try {
          await db.messageReaction.create({
            data: { messageId: id, userId: user.id, emoji, kind: 'dm' },
          })
        } catch {
          // already exists — ignore
        }
      } else {
        await db.messageReaction.deleteMany({
          where: { messageId: id, userId: user.id, emoji, kind: 'dm' },
        })
      }
      const reactions = await db.messageReaction.findMany({ where: { messageId: id, kind: 'dm' } })
      return NextResponse.json({ reactions })
    }

    if (action === 'delete') {
      if (msg.senderId !== user.id) {
        return NextResponse.json({ error: 'Cannot delete others\' messages' }, { status: 403 })
      }
      await db.directMessage.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[circle/messages/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
