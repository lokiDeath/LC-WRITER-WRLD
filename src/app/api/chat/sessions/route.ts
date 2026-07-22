import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode')
    const sessions = await db.chatSession.findMany({
      where: { userId: user.id, ...(mode ? { mode } : {}) },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ sessions })
  } catch (err) {
    console.error('[chat/sessions GET] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const { title, mode, novelId, aiPersonality, aiMode } = body
    if (!title || !mode) return NextResponse.json({ error: 'title and mode required.' }, { status: 400 })
    if (mode === 'hidden' && !user.hiddenModeUnlocked) return NextResponse.json({ error: 'Hidden Mode not unlocked.' }, { status: 403 })
    const session = await db.chatSession.create({
      data: { userId: user.id, title, mode, novelId: novelId || null, aiPersonality: aiPersonality || null, aiMode: aiMode || 'general' },
    })
    return NextResponse.json({ session })
  } catch (err) {
    console.error('[chat/sessions POST] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
