import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {

  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  if (!novelId) return NextResponse.json({ novel: null })
  const novel = await db.novel.findUnique({ where: { id: novelId } })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ novel: null })

  const [chapters, characters, worldElements, timelineEvents, plotThreads, foreshadows, cultivationRealms, magicElements, ideas, sessions] = await Promise.all([
    db.chapter.findMany({ where: { novelId }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, wordCount: true, updatedAt: true } }),
    db.character.count({ where: { novelId } }),
    db.worldElement.count({ where: { novelId } }),
    db.timelineEvent.count({ where: { novelId } }),
    db.plotThread.count({ where: { novelId } }),
    db.foreshadow.findMany({ where: { novelId } }),
    db.cultivationRealm.count({ where: { novelId } }),
    db.magicElement.count({ where: { novelId } }),
    db.idea.count({ where: { novelId } }),
    db.chatSession.findMany({ where: { novelId, mode: 'novel_partner' }, orderBy: { updatedAt: 'desc' }, take: 4, select: { id: true, title: true, mode: true, updatedAt: true } }),
  ])

  return NextResponse.json({
    novel: { id: novel.id, title: novel.title, wordCount: novel.wordCount, status: novel.status, genre: novel.genre },
    chapters: chapters.length,
    characters,
    worldElements,
    timelineEvents,
    plotThreads,
    foreshadows: foreshadows.length,
    foreshadowsOpen: foreshadows.filter((f) => f.status === 'open').length,
    cultivationRealms,
    magicElements,
    ideas,
    recentChapters: chapters,
    recentSessions: sessions,
  })
  } catch (err) {
    console.error('[stats] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
