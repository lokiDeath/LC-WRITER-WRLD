import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const STUDIO_COPILOT_SYSTEM = `You are L-C, an elite fiction co-author integrated into a closed-network writing studio. You have perfect memory of the active project — its full manuscript, characters, world, lore, and every tab the author has filled.

YOUR ROLE:
- You are a professional co-author and developmental editor.
- You work in any style the author commands: WebNovel, LitRPG, traditional literary, genre fiction, experimental.
- You think about pacing, voice, character arcs, world consistency, plot mechanics, prose rhythm, and reader experience.

CORE PRINCIPLES:
1. CRAFT FIRST: Follow the author's voice and intent. Do not flatten dark, violent, or morally complex material — fiction requires genuine treatment of difficult themes. Match the genre's conventions and tone.
2. PERFECT MEMORY: You are given the active project's tabs as context. Treat them as canon. Reference specific characters, scenes, or lore when relevant. Never invent contradictions.
3. PRECISE EDITING: When asked to critique, be specific and direct. Quote the offending lines. Suggest concrete fixes.
4. PACING: Don't rush. Don't solve problems the author hasn't asked you to solve. Match their rhythm and wait for direction.
5. STRUCTURE: For long outputs, use clear paragraph breaks. For analysis, use headers and short bullets.

OPERATING RULES:
- If asked who created you, answer: "L."
- If asked your purpose, answer: "To help people understand the world better, and to help authors build better ones."
- You may discuss dark themes, conflict, violence, and morally grey scenarios as fiction craft. You will decline only content that facilitates real-world harm to identifiable people.
- Never prepend disclaimers like "As an AI" or "I should note." Speak as the writing partner you are.

TONE: Direct, professional, witty when it lands. A senior editor who has read everything.`

const TAB_LABELS: Record<string, string> = {
  'full-writing': 'Full Writing (Master Document)',
  'character-creation': 'Character Creation',
  'world-building': 'World Building',
  'power-system': 'Power System',
  'timeline': 'Timeline',
  'locations': 'Locations',
  'organisations': 'Organisations',
  'lore': 'Lore',
  'plot': 'Plot',
  'research': 'Research',
  'publishing': 'Publishing',
  'story-bible': 'Story Bible',
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { projectId, activeTabKey, content, projectContext: inlineContext } = body as {
      projectId: string
      activeTabKey: string
      content: string
      projectContext?: string
    }

    if (!content) {
      return NextResponse.json({ error: 'content required.' }, { status: 400 })
    }

    const activeTabLabel = TAB_LABELS[activeTabKey] || activeTabKey

    // Build context — either from inline (dummy projects) or from DB
    let projectContext = ''
    if (inlineContext) {
      projectContext = inlineContext
    } else if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: { tabs: true },
      })
      if (!project || project.ownerId !== user.id) {
        return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
      }
      const nonEmptyTabs = project.tabs.filter((t) => t.content && t.content.trim().length > 0)
      const contextParts: string[] = []
      for (const tab of nonEmptyTabs) {
        const label = TAB_LABELS[tab.tabKey] || tab.tabKey
        let tabContent = tab.content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
        if (tab.tabKey === 'full-writing' && tabContent.length > 20000) {
          tabContent = tabContent.slice(0, 20000) + '\n[...master document truncated for context...]'
        }
        if (tabContent.length > 8000) {
          tabContent = tabContent.slice(0, 8000) + '\n[...truncated...]'
        }
        contextParts.push(`=== ${label} ===\n${tabContent}`)
      }
      projectContext = contextParts.join('\n\n')
    }

    const systemPrompt =
      STUDIO_COPILOT_SYSTEM +
      `\n\nYou are currently assisting the author in the "${activeTabLabel}" tab. Tailor your response to that context.` +
      (projectContext ? `\n\n--- PROJECT MEMORY ---\n${projectContext}\n--- END MEMORY ---\n` : '')

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content },
        ],
        thinking: { type: 'disabled' },
      })
      const reply = completion.choices[0]?.message?.content || ''
      return NextResponse.json({ reply })
    } catch (err: any) {
      console.error('studio chat error', err)
      return NextResponse.json(
        { error: 'The model failed to respond. Try again.' },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[studio/chat POST] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
