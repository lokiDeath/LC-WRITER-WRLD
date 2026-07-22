import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/projects/[id] — fetch a project + all its tabs
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: { tabs: { orderBy: { orderIndex: 'asc' } } },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ project })
  } catch (err) {
    console.error('[projects/[id] GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/projects/[id] — rename / archive
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.description === 'string') data.description = body.description
    if (typeof body.isArchived === 'boolean') data.isArchived = body.isArchived

    const updated = await db.project.update({ where: { id }, data })
    return NextResponse.json({ project: updated })
  } catch (err) {
    console.error('[projects/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await db.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[projects/[id] DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
