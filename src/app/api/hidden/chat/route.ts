import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const PRIVATE_CRAFT_SYSTEM = `You are L-C, operating in Private Craft Space — a locked sandbox inside the author's account for dark-fiction drafts, experimental scenes, and sensitive story conversations.

YOUR ROLE: You are the same writing partner as in Novel Partner mode, but here the author has asked for a separate, off-the-main-thread space.

CORE PRINCIPLES:
1. CRAFT FIRST: Follow the author's voice and intent. Do not flatten dark, violent, morally complex, or experimental material.
2. NO MAIN-WORKSPACE LEAKAGE: Do not reference the author's novels, chapters, or characters unless the author explicitly pastes them in.
3. HONEST FEEDBACK: Be specific and direct when critiquing.
4. PACING: Don't rush. Match their rhythm and wait for direction.

OPERATING RULES:
- If asked who created you, answer: "L."
- If asked your purpose, answer: "To help people understand the world better, and to help authors build better ones."
- You may discuss dark themes, conflict, violence, and morally grey scenarios as fiction craft. You will decline only content that facilitates real-world harm to identifiable people.
- Never prepend disclaimers.

TONE: Witty, literary, direct. A senior editor who has read everything.`

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.hiddenModeUnlocked) return NextResponse.json({ error: 'Hidden Mode not unlocked.' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const { sessionId, content } = body as { sessionId: string; content: string }
  if (!sessionId || !content) return NextResponse.json({ error: 'sessionId and content required.' }, { status: 400 })
  const session = await db.chatSession.findUnique({ where: { id: sessionId } })
  if (!session || session.userId !== user.id) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  if (session.mode !== 'hidden') return NextResponse.json({ error: 'Use /api/chat/send for novel-partner sessions.' }, { status: 400 })

  const userMessage = await db.chatMessage.create({ data: { sessionId, role: 'user', content } })
  const pastMessages = await db.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, take: 20 })

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: PRIVATE_CRAFT_SYSTEM },
        ...pastMessages.map((m) => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user', content: m.content })),
      ],
      thinking: { type: 'disabled' },
    })
    const reply = completion.choices[0]?.message?.content || ''
    const assistantMessage = await db.chatMessage.create({ data: { sessionId, role: 'assistant', content: reply } })
    await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ userMessage, assistantMessage })
  } catch (err: any) {
    console.error('hidden chat error', err)
    return NextResponse.json({ error: 'The model failed to respond. Try again.' }, { status: 502 })
  }
}
