import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Demo Google login is disabled. Use real Google authentication." }, { status: 410 })
}
