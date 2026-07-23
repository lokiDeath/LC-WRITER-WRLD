import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const project = await db.project.findFirst({ where: { id, ownerId: user.id }, select: { id: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const messages = await db.projectChatMessage.findMany({
      where: { projectId: id, userId: user.id }, orderBy: { createdAt: 'asc' }, take: 80,
      select: { id: true, role: true, content: true, createdAt: true },
    })
    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[project chat GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
