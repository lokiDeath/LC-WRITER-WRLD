import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Initialize the 12 default core tabs for a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: { tabs: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const TAB_DEFS = [
      { key: 'full-writing', label: 'Full Writing', orderIndex: 0 },
      { key: 'character-creation', label: 'Character Creation', orderIndex: 1 },
      { key: 'world-building', label: 'World Building', orderIndex: 2 },
      { key: 'power-system', label: 'Power System', orderIndex: 3 },
      { key: 'timeline', label: 'Timeline', orderIndex: 4 },
      { key: 'locations', label: 'Locations', orderIndex: 5 },
      { key: 'organisations', label: 'Organisations', orderIndex: 6 },
      { key: 'lore', label: 'Lore', orderIndex: 7 },
      { key: 'plot', label: 'Plot', orderIndex: 8 },
      { key: 'research', label: 'Research', orderIndex: 9 },
      { key: 'publishing', label: 'Publishing', orderIndex: 10 },
      { key: 'story-bible', label: 'Story Bible', orderIndex: 11 },
    ]

    const existingKeys = new Set(project.tabs.map((t) => t.tabKey))
    const missing = TAB_DEFS.filter((t) => !existingKeys.has(t.key))

    if (missing.length > 0) {
      await db.projectTab.createMany({
        data: missing.map((t) => ({
          projectId: id,
          tabKey: t.key,
          title: t.label,
          orderIndex: t.orderIndex,
          content: '',
        })),
      })
    }

    return NextResponse.json({ created: missing.length })
  } catch (err) {
    console.error('[projects/[id]/tabs/init POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
