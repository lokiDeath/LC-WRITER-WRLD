import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ensureSeed } from '@/lib/seed'

export async function GET(req: NextRequest) {
  try {
    await ensureSeed()
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    return NextResponse.json({ user })
  } catch (err) {
    console.error('[auth/me] error:', err)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
