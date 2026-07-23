import { NextResponse } from "next/server";

export async function GET() {
  try {

  return NextResponse.json({ message: "Hello, world!" });
  } catch (err) {
    console.error('[.] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}