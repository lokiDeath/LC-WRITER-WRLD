import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const sessions = await db.chatSession.findMany({
    take: 100,
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { displayName: true, loginId: true } } },
  })
  return NextResponse.json({ sessions })
}
