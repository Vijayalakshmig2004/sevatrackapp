import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  return NextResponse.json({ error: "Demo email login is disabled. Use real Google authentication." }, { status: 410 })
}
