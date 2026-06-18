import { NextResponse } from "next/server"
import { setSession, ensureDemoUser } from "@/lib/server-data"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.email === "test@example.com" && body.password === "password123") {
      const demoUser = await ensureDemoUser()
      await setSession(demoUser.id)
      return NextResponse.json({ success: true, user: demoUser })
    }
    return NextResponse.json({ error: "Invalid test credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
