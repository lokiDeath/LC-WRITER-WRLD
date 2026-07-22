import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const novelId = searchParams.get('novelId')
  const chars = await db.character.findMany({
    where: { authorId: user.id, ...(novelId ? { novelId } : {}) },
    include: { novel: { select: { id: true, title: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({ characters: chars })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { name, alias, role, age, birthday, race, cultivation, powerLevel, occupation, appearance, height, weight, hair, eyes, voice, accent, personality, likes, dislikes, habits, goals, secrets, background, abilities, qi, mana, aether, arc, quotes, inventory, skills, magic, notes, portraitUrl, novelId } = body
  if (!name) return NextResponse.json({ error: 'Name required.' }, { status: 400 })
  const created = await db.character.create({
    data: { name, alias: alias || null, role: role || 'supporting', age: age || null, birthday: birthday || null, race: race || null, cultivation: cultivation || null, powerLevel: powerLevel || null, occupation: occupation || null, appearance: appearance || '', height: height || null, weight: weight || null, hair: hair || null, eyes: eyes || null, voice: voice || null, accent: accent || null, personality: personality || '', likes: likes || null, dislikes: dislikes || null, habits: habits || null, goals: goals || null, secrets: secrets || null, background: background || '', abilities: abilities || '', qi: qi || null, mana: mana || null, aether: aether || null, arc: arc || '', quotes: quotes || null, inventory: inventory || null, skills: skills || null, magic: magic || null, notes: notes || null, portraitUrl: portraitUrl || null, authorId: user.id, novelId: novelId || null },
  })
  return NextResponse.json({ character: created })
}
