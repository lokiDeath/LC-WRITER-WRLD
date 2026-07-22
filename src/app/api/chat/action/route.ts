import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

const ACTION_PROMPTS: Record<string, string> = {
  rewrite: 'Rewrite the following text, preserving meaning and voice but improving prose quality. Output ONLY the rewritten text.',
  expand: 'Expand the following text with more sensory detail, internal thought, and atmosphere. Keep the author voice. Output ONLY the expanded text.',
  shorten: 'Shorten the following text by ~30% without losing key information or voice. Output ONLY the shortened text.',
  fix_flow: 'Fix the flow and transitions of the following text. Rearrange sentences if needed. Output ONLY the revised text.',
  dialogue: 'Improve the dialogue in the following text. Make it sharper, more natural, and more revealing of character. Output ONLY the revised text.',
  describe_better: 'Improve the descriptions in the following text. Make them more vivid and specific without bloating. Output ONLY the revised text.',
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const { action, text, novelId, chapterTitle } = body as { action: string; text: string; novelId?: string; chapterTitle?: string }
    if (!action || !text) return NextResponse.json({ error: 'action and text required.' }, { status: 400 })
    const prompt = ACTION_PROMPTS[action]
    if (!prompt) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

    let contextNote = ''
    if (novelId) {
      const novel = await db.novel.findUnique({ where: { id: novelId } })
      if (novel && novel.authorId === user.id) {
        contextNote = `\n\nContext: This is from the novel "${novel.title}" (${novel.genre || 'unspecified genre'}). Chapter: ${chapterTitle || 'untitled'}.`
      }
    }

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are L-C, an elite fiction editor. ' + prompt + contextNote + '\n\nMaintain the author\'s voice. Do not add disclaimers. Do not explain your changes. Just return the revised text.' },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
      })
      const result = completion.choices[0]?.message?.content || ''
      return NextResponse.json({ result })
    } catch (err) {
      console.error('chat action error', err)
      return NextResponse.json({ error: 'The model failed to respond. Try again.' }, { status: 502 })
    }
  } catch (err) {
    console.error('[chat/action] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
