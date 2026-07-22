import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const SCAN_SYSTEM = `You are L-C, a consistency checker for novel manuscripts. You are given the full text of a novel along with its characters, world elements, timeline events, plot threads, and foreshadows.

Your job: scan for contradictions and inconsistencies. Look for: plot holes, age mistakes, timeline errors, power inconsistencies, name mistakes, character personality shifts, magic inconsistencies, kingdom mistakes, broken promises, forgotten foreshadowing, impossible travel.

Output format: Return a JSON array of issues. Each issue should have:
- "type": one of "plot_hole", "age_mistake", "timeline_error", "power_inconsistency", "name_mistake", "personality_shift", "magic_inconsistency", "kingdom_mistake", "broken_promise", "forgotten_foreshadowing", "impossible_travel", "other"
- "severity": "high" | "medium" | "low"
- "description": a specific description of the issue
- "location": where in the text (chapter title or quote)

If you find no issues, return an empty array: []
Return ONLY the JSON array. No preamble, no markdown fences.`

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { novelId } = body as { novelId: string }
  if (!novelId) return NextResponse.json({ error: 'novelId required.' }, { status: 400 })

  const novel = await db.novel.findUnique({
    where: { id: novelId },
    include: {
      chapters: { orderBy: { orderIndex: 'asc' } },
      characters: true,
      worldElements: true,
      timelineEvents: { orderBy: { orderIndex: 'asc' } },
      plotThreads: true,
      foreshadows: true,
      cultivationRealms: { orderBy: { stage: 'asc' } },
      magicElements: true,
    },
  })
  if (!novel || novel.authorId !== user.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const chapterDump = novel.chapters.map((c) => `### ${c.title}\n\n${c.content}`).join('\n\n---\n\n')
  const charDump = novel.characters.map((c) => `${c.name} (${c.role}, age ${c.age || '?'}) — ${c.personality}\nBackground: ${c.background}`).join('\n\n')
  const worldDump = novel.worldElements.map((w) => `${w.type}: ${w.name} — ${w.description}`).join('\n')
  const timelineDump = novel.timelineEvents.map((t) => `${[t.year, t.month, t.day, t.hour].filter(Boolean).join('-')}: ${t.event} @ ${t.location}`).join('\n')
  const plotDump = novel.plotThreads.map((p) => `${p.type} [${p.status}]: ${p.title} — ${p.description}`).join('\n')
  const foreshadowDump = novel.foreshadows.map((f) => `[${f.status}] ${f.clue} (introduced ch.${f.introducedInChapter || '?'})`).join('\n')
  const cultDump = novel.cultivationRealms.map((r) => `Stage ${r.stage}: ${r.name} (${r.energyType})`).join('\n')
  const magicDump = novel.magicElements.map((m) => `${m.type}: ${m.name} — ${m.description}`).join('\n')

  const context = `NOVEL: ${novel.title} (${novel.genre || 'unspecified'})\n\n=== CHARACTERS ===\n${charDump || '(none)'}\n\n=== WORLD ELEMENTS ===\n${worldDump || '(none)'}\n\n=== TIMELINE ===\n${timelineDump || '(none)'}\n\n=== PLOT THREADS ===\n${plotDump || '(none)'}\n\n=== FORESHADOWS ===\n${foreshadowDump || '(none)'}\n\n=== CULTIVATION REALMS ===\n${cultDump || '(none)'}\n\n=== MAGIC SYSTEM ===\n${magicDump || '(none)'}\n\n=== CHAPTERS ===\n${chapterDump || '(none)'}`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SCAN_SYSTEM },
        { role: 'user', content: context },
      ],
      thinking: { type: 'disabled' },
    })
    const raw = completion.choices[0]?.message?.content || '[]'
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    let issues: any[] = []
    try {
      issues = JSON.parse(cleaned)
    } catch {
      issues = [{ type: 'other', severity: 'medium', description: raw.slice(0, 1000), location: 'scan output' }]
    }
    return NextResponse.json({ issues })
  } catch (err: any) {
    console.error('scan error', err)
    return NextResponse.json({ error: 'The scan failed. Try again.' }, { status: 502 })
  }
}
