import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/projects — list current user's projects
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projects = await db.project.findMany({
      where: { ownerId: user.id, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { tabs: true } } },
    })

    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[projects GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description } = await req.json().catch(() => ({}))
    if (!name?.trim()) return NextResponse.json({ error: 'Project name required.' }, { status: 400 })

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: user.id,
      },
    })

    return NextResponse.json({ project })
  } catch (err) {
    console.error('[projects POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
