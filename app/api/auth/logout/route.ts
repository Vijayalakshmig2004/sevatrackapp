import { NextResponse } from "next/server"
import { clearSession } from "@/lib/server-data"

export async function POST() {
  await clearSession()
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  await clearSession()
  return NextResponse.redirect(new URL("/", request.url))
}
