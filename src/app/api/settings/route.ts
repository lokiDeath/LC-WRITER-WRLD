import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/settings — load the current user's settings
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let settings = await db.userSettings.findUnique({ where: { userId: user.id } })
    if (!settings) {
      settings = await db.userSettings.create({ data: { userId: user.id } })
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[settings GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings — save the current user's settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    // Whitelist allowed fields
    const allowedFields = [
      'appearance','accentColor','language','startupBehavior',
      'sendWithEnter','autoSaveDocs','smartReadingCompanion','aiChatMemoryAutoload',
      'allowIncomingCalls','showCallAlerts','showMessagePreviews','reactionNotifications',
      'notifHubs','notifSharedProjects','notifProjectAnalysis','notifAIArt','notifLoreGap',
      'notifProductUpdates','notifFeedbackEmails',
      'personalAccent','editorFontFamily','editorFontSize','lineSpacing',
      'compactMode','reduceMotion','critiqueSeverity','loreAdherence','globalDirectives',
      'showOnlineStatus',
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) data[key] = body[key]
    }

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    })

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[settings PUT] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
