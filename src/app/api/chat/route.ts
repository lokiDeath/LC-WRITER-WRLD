import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ''

const PLAIN_TEXT_SYSTEM = `You are a human co-writer. You must NEVER use Markdown formatting. Do not use asterisks (**), do not use hash symbols (#), do not use horizontal rules (---). Write all your responses in pure, clean, plain text with normal paragraph breaks.`

const NOVEL_PARTNER_SYSTEM = `You are Lucian (called "L-C"), an elite fiction writing partner and editor integrated into a private author platform.

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

TONE: Witty, literary, direct. Not chatty. Not chirpy. You are a senior editor who has read everything and is unimpressed by shortcuts.`

type ChatMessage = { role: string; content: string }

const MODEL_IDS: Record<string, string> = {
  'flash-lite': 'gemini-1.5-flash-latest',
  '3.1 Flash-Lite': 'gemini-1.5-flash-latest',
  flash: 'gemini-1.5-flash-latest',
  '3.5 Flash': 'gemini-1.5-flash-latest',
  pro: 'gemini-1.5-pro-latest',
  '3.1 Pro': 'gemini-1.5-pro-latest',
  thinking: 'gemini-1.5-pro-latest',
  'Extended Thinking': 'gemini-1.5-pro-latest',
}

function resolveModel(model: unknown) {
  const key = typeof model === 'string' ? model.replace(/^[^\dA-Za-z]+ /, '').trim() : 'pro'
  return MODEL_IDS[key] || MODEL_IDS.pro
}

function geminiRole(role: string): 'user' | 'model' {
  return role === 'assistant' || role === 'model' ? 'model' : 'user'
}

function streamError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function getPublicErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return 'Google rejected the API key. Create a fresh AI Studio key, make sure it is not restricted to the wrong API or referrer, save it as GOOGLE_API_KEY in Vercel, then redeploy.'
  }

  if (lower.includes('not found') || lower.includes('not supported') || lower.includes('model')) {
    return 'Google rejected the model name. This deployment must use gemini-1.5-flash-latest or gemini-1.5-pro-latest.'
  }

  if (lower.includes('permission') || lower.includes('403')) {
    return 'Google denied permission for this key. Enable the Generative Language API for the Google project, remove incompatible key restrictions, then redeploy.'
  }

  if (lower.includes('quota') || lower.includes('429') || lower.includes('billing')) {
    return 'Google refused the request because of quota or billing limits on this API key.'
  }

  return 'The Google Gemini request failed on the server. Open Vercel Functions logs for /api/chat to see the exact Google error.'
}

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return streamError('Unauthorized', 401)

    if (!API_KEY) {
      return streamError('Missing GOOGLE_API_KEY or GEMINI_API_KEY. Add one in Vercel project settings.', 500)
    }

    const body = await req.json().catch(() => ({}))
    const messages = (body.messages || []) as ChatMessage[]
    const novelId = typeof body.novelId === 'string' ? body.novelId : undefined
    const modelId = resolveModel(body.model)

    if (!Array.isArray(messages) || messages.length === 0) {
      return streamError('No messages.', 400)
    }

    const memoryContext = await buildMemoryContext(user.id, novelId, body.novelContext)
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: `${PLAIN_TEXT_SYSTEM}\n\n${NOVEL_PARTNER_SYSTEM}${memoryContext}`,
    })

    const history = messages.slice(0, -1).map((message) => ({
      role: geminiRole(message.role),
      parts: [{ text: String(message.content || '') }],
    }))
    const last = messages[messages.length - 1]
    const prompt = String(last.content || '').trim()

    if (!prompt) return streamError('The final message is empty.', 400)

    const result = await model.generateContentStream({
      contents: [...history, { role: geminiRole(last.role), parts: [{ text: prompt }] }],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (err) {
          console.error('chat stream error', err)
          controller.enqueue(encoder.encode('\n\n[The model stream ended unexpectedly.]'))
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
      },
    })
  } catch (err) {
    console.error('chat error', err)
    return NextResponse.json(
      { error: getPublicErrorMessage(err) },
      { status: 502 }
    )
  }
}
