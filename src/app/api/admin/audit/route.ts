import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser(req)
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const logs = await db.auditLog.findMany({
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { loginId: true, displayName: true } } },
  })
  return NextResponse.json({ logs })
}
