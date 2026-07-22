import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logAudit } from '@/lib/auth'

// POST /api/admin/users/[id]/approve-divinity
// Approves a Tier 5 / 100% attunement author for ascension to Tier 6
// (Author Progenitor). Sends an in-app notification via AuditLog.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser(req)
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
    const { id } = await params
    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (target.ascensionTier !== 4 || target.attunement < 100) {
      return NextResponse.json(
        {
          error:
            'User is not at Tier 5 with 100% attunement — divinity approval requires the tribulation bottleneck.',
        },
        { status: 400 }
      )
    }

    // Ascend to Tier 6 (database tier 5), reset attunement
    const updated = await db.user.update({
      where: { id },
      data: {
        ascensionTier: 5, // Tier 6 in UI (1-indexed)
        attunement: 0,
      },
    })

    // Log the approval as an in-app notification (audit log)
    await logAudit(
      admin.id,
      'APPROVE_DIVINITY',
      `Approved divinity for ${target.displayName} (${target.loginId}). Ascended to Tier 6 — Author Progenitor.`
    )

    // Also log a notification entry visible to the user
    await logAudit(
      target.id,
      'DIVINITY_APPROVED',
      `Your divinity has been approved. You have ascended to Tier 6 — Author Progenitor.`
    )

    return NextResponse.json({ user: updated })
  } catch (err) {
    console.error('[admin/approve-divinity] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
