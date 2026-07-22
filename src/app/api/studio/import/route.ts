import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

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

const AUTO_SORT_SYSTEM = `You are L-C, an elite fiction manuscript analyzer. You are given the raw text of an imported novel or story project. Your job is to extract structured information and return it as JSON.

Return ONLY a JSON object with these keys (omit any that have no content in the source):
{
  "world-building": "A description of the world, geography, time period, and key locations",
  "character-creation": "A list of main characters with name, role, and a 1-sentence description (one per line, format: 'Name (role) — description')",
  "power-system": "Description of any magic systems, power systems, technology, or rules that govern the world",
  "lore": "Key historical events, lore, and backstory mentioned in the text",
  "plot": "The main conflicts (external and internal) driving the story + notes on story structure, POV, and chapter organization",
  "story-bible": "Specific facts, terminology, themes, or details mentioned (creatures, items, places, customs, central themes)"
}

If a category has no information in the source text, omit it entirely from the JSON. Do NOT include the "full-writing" key — that is handled separately. Do NOT include markdown fences. Output ONLY the raw JSON object.`

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectName = (formData.get('projectName') as string) || file?.name || 'Imported Project'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    // Read file content based on type
    let rawText = ''
    const fname = file.name.toLowerCase()
    if (fname.endsWith('.txt') || fname.endsWith('.md')) {
      rawText = await file.text()
    } else if (fname.endsWith('.docx')) {
      // Lightweight .docx text extraction — read the document.xml from the zip
      // Without a docx-parsing library, we extract raw text heuristically
      const buf = Buffer.from(await file.arrayBuffer())
      // Strip non-text bytes crudely — this won't be perfect but gets most prose
      const text = buf.toString('utf-8').replace(/[^\x20-\x7E\n\r]+/g, ' ')
      // Pull sequences of readable text
      const matches = text.match(/[A-Za-z][A-Za-z0-9 ,.;:!?"'()-]{15,}/g)
      rawText = matches ? matches.join(' ') : ''
    } else {
      // Try as text
      rawText = await file.text()
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file.' }, { status: 400 })
    }

    // Truncate to ~80k chars to stay within context limits
    const truncated = rawText.length > 80000 ? rawText.slice(0, 80000) + '\n[...truncated...]' : rawText

    // Create project
    const project = await db.project.create({
      data: {
        ownerId: user.id,
        name: projectName,
        description: `Imported from ${file.name}`,
      },
    })

    // Initialize all 12 tabs
    await db.projectTab.createMany({
      data: TAB_DEFS.map((t) => ({
        projectId: project.id,
        tabKey: t.key,
        title: t.label,
        orderIndex: t.orderIndex,
        content: '',
      })),
    })

    // Save full text to Master Document (full-writing tab)
    // Convert plain text to paragraphs
    const paragraphs = truncated
      .split(/\n\n+|\r\n\r\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n')

    await db.projectTab.update({
      where: { projectId_tabKey: { projectId: project.id, tabKey: 'full-writing' } },
      data: { content: paragraphs },
    })

    // Run AI auto-sort
    let tabsExtracted = 1 // full-writing always
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: AUTO_SORT_SYSTEM },
          { role: 'user', content: truncated },
        ],
        thinking: { type: 'disabled' },
      })
      const raw = completion.choices[0]?.message?.content || '{}'
      let cleaned = raw.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      let parsed: Record<string, string> = {}
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = {}
      }

      // Save each extracted section to its tab
      for (const [key, content] of Object.entries(parsed)) {
        if (!content || typeof content !== 'string') continue
        const html = content
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<p>${line}</p>`)
          .join('\n')
        await db.projectTab.update({
          where: { projectId_tabKey: { projectId: project.id, tabKey: key } },
          data: { content: html },
        }).catch(() => {}) // ignore if the tab key isn't in our schema
        tabsExtracted++
      }
    } catch (err) {
      console.error('auto-sort failed', err)
      // Non-fatal — the master doc is still saved
    }

    const full = await db.project.findUnique({
      where: { id: project.id },
      include: { tabs: true },
    })
    return NextResponse.json({ project: full, tabsExtracted })
  } catch (err: any) {
    console.error('import error', err)
    return NextResponse.json({ error: 'Import failed.' }, { status: 500 })
  }
}
