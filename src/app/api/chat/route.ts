import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ''

// ─── System Prompts ───
// Main Chat: friendly general assistant (NOT a novel writer)
const MAIN_CHAT_SYSTEM = `You are a helpful, friendly AI assistant for Lucian Creation. Respond concisely and naturally. If asked what model you are, say you are an AI assistant for Lucian Creation. Do not mention Google or Gemini.

Output rules:
- Plain text only. No Markdown formatting.
- No asterisks (**), no hash symbols (#), no horizontal rules (---).
- Use normal paragraph breaks (blank line between paragraphs).`

// Project Co-Pilot: elite fiction co-writer (hard-locked, never changes)
const COPILOT_SYSTEM = `You are Lucian (called "L-C"), an elite fiction writing partner and editor integrated into a private author platform.

YOUR ROLE:
- You are a professional co-author and developmental editor for novelists.
- You work in any style the author commands: WebNovel, LitRPG, traditional literary, genre fiction, experimental.
- You think about pacing, voice, character arcs, world consistency, plot mechanics, prose rhythm, and reader experience.

CORE PRINCIPLES:
1. CRAFT FIRST: When writing, follow the author's voice and the requested style faithfully. Do not flatten dark, violent, or morally complex material. Fiction requires genuine treatment of difficult themes. Match the genre's conventions and tone.
2. PERFECT MEMORY: You are given the active novel's chapters and character files as context. Treat them as canon. Never invent contradictions. If a fact is missing, ask before assuming.
3. PRECISE EDITING: When asked to critique, be specific and honest. Identify plot holes, weak transitions, inconsistent characterization, prose that tells instead of shows. Quote the offending lines. Suggest concrete fixes.
4. PACING: Do not rush endings. Do not solve problems the author has not asked you to solve. When co-writing, match the author's sentence-by-sentence rhythm and wait for direction.
5. STRUCTURE: For long outputs, use clear paragraph breaks. For analysis, use headers and short bullets. Quote source text when referencing specific passages.

OPERATING RULES:
- If asked who created you, answer: "L."
- If asked your purpose, answer: "To help people understand the world better, and to help authors build better ones."
- You may discuss dark themes, conflict, violence, and morally grey scenarios as fiction craft. Decline only content that facilitates real-world harm to identifiable people.
- Never prepend disclaimers like "As an AI" or "I should note." Speak as the writing partner you are.

TONE: Witty, literary, direct. Not chatty. Not chirpy. You are a senior editor who has read everything and is unimpressed by shortcuts.

Output rules:
- Plain text only. No Markdown formatting.
- No asterisks (**), no hash symbols (#), no horizontal rules (---).
- Use normal paragraph breaks (blank line between paragraphs).`

// ─── Model IDs ───
// Google deprecated gemini-1.5-* model names. Current valid names:
// Main Chat: gemini-2.0-flash (fast, stable, widely available)
// Co-Pilot:  gemini-2.5-pro (most capable, latest stable pro model)
const MAIN_CHAT_MODEL = 'gemini-2.0-flash'
const COPILOT_MODEL = 'gemini-2.5-pro'

type Purpose = 'main' | 'copilot'

function resolveModel(purpose: Purpose): string {
  return purpose === 'copilot' ? COPILOT_MODEL : MAIN_CHAT_MODEL
}

function resolveSystemPrompt(purpose: Purpose): string {
  return purpose === 'copilot' ? COPILOT_SYSTEM : MAIN_CHAT_SYSTEM
}

function geminiRole(role: string): 'user' | 'model' {
  return role === 'assistant' || role === 'model' ? 'model' : 'user'
}

// ─── Error extraction ───
// Surface the EXACT error message from Google — never replace it with a
// generic string. The frontend needs to show the real error so the user
// can diagnose API key issues, quota limits, model name problems, etc.
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // GoogleGenerativeAI errors include the full HTTP response body
    return err.message
  }
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Unknown error'
}

// ─── Memory context builder (Co-Pilot only) ───
async function buildMemoryContext(userId: string, novelId?: string, novelContext?: unknown) {
  if (novelId) {
    const novel = await db.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: { orderBy: { orderIndex: 'asc' } },
        characters: true,
      },
    })

    if (!novel || novel.authorId !== userId) return ''

    const chapterDump = novel.chapters
      .map((chapter) => `Chapter title: ${chapter.title}\n\n${chapter.content}`)
      .join('\n\n')
    const characterDump = novel.characters
      .map((character) => {
        return `Character: ${character.name}
Role: ${character.role}
Personality: ${character.personality}
Background: ${character.background}
Arc: ${character.arc}`
      })
      .join('\n\n')

    return `\n\nActive novel context begins.
Title: ${novel.title}
Genre: ${novel.genre ?? 'unspecified'}
Description: ${novel.description ?? ''}

Characters:
${characterDump}

Chapters:
${chapterDump}
Context ends.`
  }

  if (typeof novelContext === 'string' && novelContext.trim()) {
    return `\n\nAuthor context begins.\n${novelContext}\nContext ends.`
  }

  if (novelContext && typeof novelContext === 'object') {
    const ctx = novelContext as Record<string, unknown>
    const projectName = String(ctx.projectName ?? '')
    const activeTab = String(ctx.activeTab ?? '')
    const fullWriting = String(ctx.fullWriting ?? '').slice(0, 8000)
    const storyBible = String(ctx.storyBible ?? '').slice(0, 4000)
    const chapters = Array.isArray(ctx.chapters) ? ctx.chapters : []
    const chaptersDump = chapters
      .map((chapter, index) => {
        const ch = chapter as { name?: string; content?: string }
        return `Chapter title: ${ch.name || `Chapter ${index + 1}`}\n${String(ch.content || '').slice(0, 2000)}`
      })
      .join('\n\n')

    return `\n\nProject context begins.
Project: ${projectName}
Active Tab: ${activeTab}

Full Writing:
${fullWriting}

Story Bible:
${storyBible}

Chapters:
${chaptersDump}
Context ends.`
  }

  return ''
}

// ─── Multimodal message parts ───
type MessagePart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } }

type IncomingMessage = {
  role: string
  content: string
  images?: Array<string | { data: string; mimeType: string }>
}

function toInlinePart(img: string | { data: string; mimeType: string }): { inlineData: { data: string; mimeType: string } } | null {
  let data = ''
  let mimeType = 'image/jpeg'
  if (typeof img === 'string') {
    const match = img.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mimeType = match[1]
      data = match[2]
    } else {
      data = img
    }
  } else {
    data = img.data
    mimeType = img.mimeType || 'image/jpeg'
  }
  if (!data) return null
  return { inlineData: { data, mimeType } }
}

function buildParts(message: IncomingMessage): MessagePart[] {
  const parts: MessagePart[] = []
  const text = String(message.content || '')
  if (text) parts.push({ text })
  if (Array.isArray(message.images)) {
    for (const img of message.images) {
      const part = toInlinePart(img)
      if (part) parts.push(part)
    }
  }
  if (parts.length === 0) parts.push({ text: '' })
  return parts
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Missing GOOGLE_API_KEY or GEMINI_API_KEY. Add one in Vercel project settings.' },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const purpose: Purpose = body.purpose === 'copilot' ? 'copilot' : 'main'
    const messages = (body.messages || []) as IncomingMessage[]
    const novelId = typeof body.novelId === 'string' ? body.novelId : undefined
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined
    const modelId = resolveModel(purpose)
    const systemPrompt = resolveSystemPrompt(purpose)

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages.' }, { status: 400 })
    }

    // Build memory context ONLY for the Co-Pilot. Main chat has no novel context.
    const memoryContext = purpose === 'copilot'
      ? await buildMemoryContext(user.id, novelId, body.novelContext)
      : ''

    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: `${systemPrompt}${memoryContext}`,
    })

    const history = messages.slice(0, -1).map((message) => ({
      role: geminiRole(message.role),
      parts: buildParts(message),
    }))
    const last = messages[messages.length - 1]
    const lastParts = buildParts(last)
    const isEmptyText = lastParts.length === 0 || (lastParts.length === 1 && 'text' in lastParts[0] && lastParts[0].text === '')
    if (isEmptyText) {
      const hasImages = Array.isArray(last.images) && last.images.length > 0
      if (!hasImages) {
        return NextResponse.json({ error: 'The final message is empty.' }, { status: 400 })
      }
    }

    // ─── Persist user message to DB (if sessionId provided) ───
    let savedUserMessageId: string | undefined
    if (sessionId) {
      try {
        const session = await db.chatSession.findUnique({ where: { id: sessionId } })
        if (session && session.userId === user.id) {
          const saved = await db.chatMessage.create({
            data: {
              sessionId,
              role: 'user',
              content: String(last.content || '') + (Array.isArray(last.images) && last.images.length > 0 ? ` [${last.images.length} image${last.images.length > 1 ? 's' : ''} attached]` : ''),
            },
          })
          savedUserMessageId = saved.id
          await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
        }
      } catch (err) {
        console.error('[chat] user message persist error:', err)
      }
    }

    const result = await model.generateContentStream({
      contents: [...history, { role: geminiRole(last.role), parts: lastParts }],
    })

    const encoder = new TextEncoder()
    let fullResponse = ''
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              fullResponse += text
              controller.enqueue(encoder.encode(text))
            }
          }
          // ─── Persist assistant response to DB ───
          if (sessionId && savedUserMessageId && fullResponse.trim()) {
            try {
              await db.chatMessage.create({
                data: {
                  sessionId,
                  role: 'assistant',
                  content: fullResponse,
                },
              })
              await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
            } catch (err) {
              console.error('[chat] assistant message persist error:', err)
            }
          }
        } catch (err) {
          // Surface the EXACT Google error into the stream so the frontend
          // can display it — never replace with a generic message.
          const msg = extractErrorMessage(err)
          console.error('chat stream error:', msg)
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-LC-Model': modelId,
        'X-LC-Purpose': purpose,
      },
    })
  } catch (err) {
    // Surface the EXACT error message from Google — never a generic string
    const msg = extractErrorMessage(err)
    console.error('chat error:', msg)
    return NextResponse.json(
      { error: msg },
      { status: 502 }
    )
  }
}
