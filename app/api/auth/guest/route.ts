import { NextResponse } from "next/server"
import { ensureGuestUser, setSession } from "@/lib/server-data"

export async function POST() {
  const user = await ensureGuestUser()
  await setSession(user.id)
  return NextResponse.json({ user })
}
