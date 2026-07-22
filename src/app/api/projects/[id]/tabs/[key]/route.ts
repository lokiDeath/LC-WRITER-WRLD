import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/projects/[id]/tabs/[key] — fetch a single tab's content
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, key } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let tab = await db.projectTab.findUnique({ where: { projectId_tabKey: { projectId: id, tabKey: key } } })
    if (!tab) {
      // Auto-create with default content
      tab = await db.projectTab.create({
        data: {
          projectId: id,
          tabKey: key,
          title: key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          content: '',
        },
      })
    }

    return NextResponse.json({ tab })
  } catch (err) {
    console.error('[projects/[id]/tabs/[key] GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/projects/[id]/tabs/[key] — save tab content
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, key } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (typeof body.content === 'string') data.content = body.content
    if (typeof body.title === 'string') data.title = body.title
    if (body.metadata !== undefined) data.metadata = body.metadata

    const tab = await db.projectTab.upsert({
      where: { projectId_tabKey: { projectId: id, tabKey: key } },
      update: data,
      create: {
        projectId: id,
        tabKey: key,
        title: body.title || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        content: typeof body.content === 'string' ? body.content : '',
      },
    })

    return NextResponse.json({ tab })
  } catch (err) {
    console.error('[projects/[id]/tabs/[key] PUT] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
