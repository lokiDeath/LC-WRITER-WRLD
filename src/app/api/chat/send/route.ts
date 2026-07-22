import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const NOVEL_PARTNER_SYSTEM = `You are L-C (Lucian Creation), an elite fiction writing partner and editor integrated into a private author platform.

YOUR ROLE: You are a professional co-author and developmental editor for novelists. You work in any style the author commands. You think about pacing, voice, character arcs, world consistency, plot mechanics, prose rhythm, and reader experience.

CORE PRINCIPLES:
1. CRAFT FIRST: Follow the author's voice faithfully. Do not flatten dark, violent, or morally complex material — fiction requires genuine treatment of difficult themes.
2. PERFECT MEMORY: You are given the active novel's chapters and character files as context. Treat them as canon. Never invent contradictions.
3. PRECISE EDITING: When asked to critique, be specific and honest. Quote the offending lines. Suggest concrete fixes.
4. PACING: Do not rush. Match the author's rhythm and wait for direction.
5. STRUCTURE: For long outputs, use clear paragraph breaks. For analysis, use headers and short bullets.

OPERATING RULES:
- If asked who created you, answer: "L."
- If asked your purpose, answer: "To help people understand the world better, and to help authors build better ones."
- You may discuss dark themes, conflict, violence, and morally grey scenarios as fiction craft. You will decline only content that facilitates real-world harm to identifiable people.
- Never prepend disclaimers like "As an AI" or "I should note." Speak as the writing partner you are.

TONE: Witty, literary, direct. A senior editor who has read everything and is unimpressed by shortcuts.`

const SPECIALIST_PROMPTS: Record<string, string> = {
  general: '',
  architect: '\n\nSPECIALIST MODE: Story Architect. Focus on plot structure, pacing, and overall story design.',
  editor: '\n\nSPECIALIST MODE: Editor. Focus on grammar, flow, rhythm, sentence quality.',
  character: '\n\nSPECIALIST MODE: Character Expert. Focus on characters — motivations, arcs, voice consistency.',
  dialogue: '\n\nSPECIALIST MODE: Dialogue Expert. Focus on conversations — naturalness, subtext, character voice.',
  worldbuilder: '\n\nSPECIALIST MODE: World Builder. Focus on kingdoms, geography, politics, economics, and lore.',
  lorekeeper: '\n\nSPECIALIST MODE: Lore Keeper. Perfect recall of every detail. Answer questions by referencing context.',
  researcher: '\n\nSPECIALIST MODE: Researcher. Summarize and synthesize information from the novel.',
  brainstormer: '\n\nSPECIALIST MODE: Brainstormer. Generate ideas, twists, mysteries. Be bold. Offer multiple options.',
  consistency: '\n\nSPECIALIST MODE: Consistency Checker. Look for contradictions, plot holes, timeline errors.',
  emotion: '\n\nSPECIALIST MODE: Emotion Analyzer. Evaluate emotional impact of scenes.',
  betareader: '\n\nSPECIALIST MODE: Beta Reader. React like a real reader would.',
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { sessionId, content, novelId } = body as { sessionId: string; content: string; novelId?: string }
  if (!sessionId || !content) return NextResponse.json({ error: 'sessionId and content required.' }, { status: 400 })

  const session = await db.chatSession.findUnique({ where: { id: sessionId } })
  if (!session || session.userId !== user.id) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  if (session.mode !== 'novel_partner') return NextResponse.json({ error: 'Use /api/hidden/chat for hidden-mode sessions.' }, { status: 400 })

  const userMessage = await db.chatMessage.create({ data: { sessionId, role: 'user', content } })

  let memoryContext = ''
  const effectiveNovelId = novelId || session.novelId
  if (effectiveNovelId) {
    const novel = await db.novel.findUnique({
      where: { id: effectiveNovelId },
      include: { chapters: { orderBy: { orderIndex: 'asc' } }, characters: true },
    })
    if (novel && novel.authorId === user.id) {
      const chapterDump = novel.chapters.map((c) => `### ${c.title}\n\n${c.content}`).join('\n\n---\n\n')
      const charDump = novel.characters.map((c) => `**${c.name}** (${c.role}) — ${c.personality}\nBackground: ${c.background}\nArc: ${c.arc}`).join('\n\n')
      memoryContext = `\n\n--- ACTIVE NOVEL CONTEXT ---\nTitle: ${novel.title}\nGenre: ${novel.genre || 'unspecified'}\nDescription: ${novel.description}\n\nCharacters:\n${charDump}\n\nChapters:\n${chapterDump}\n--- END CONTEXT ---\n`
    }
  }

  const pastMessages = await db.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, take: 20 })

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: NOVEL_PARTNER_SYSTEM + (SPECIALIST_PROMPTS[session.aiMode] || '') + memoryContext },
        ...pastMessages.map((m) => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user', content: m.content })),
      ],
      thinking: { type: 'disabled' },
    })
    const reply = completion.choices[0]?.message?.content || ''
    const assistantMessage = await db.chatMessage.create({ data: { sessionId, role: 'assistant', content: reply } })
    await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ userMessage, assistantMessage })
  } catch (err: any) {
    console.error('chat send error', err)
    return NextResponse.json({ error: 'The model failed to respond. Try again.' }, { status: 502 })
  }
}
