import { NextRequest, NextResponse } from "next/server"
import { ensureAuthenticatedUser, getSupabaseUserFromAccessToken, setSession } from "@/lib/server-data"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    if (!body.accessToken || typeof body.accessToken !== "string") {
      return NextResponse.json({ error: "Missing access token." }, { status: 400 })
    }

    const authUser = await getSupabaseUserFromAccessToken(body.accessToken)
    const user = await ensureAuthenticatedUser(authUser)
    await setSession(user.id)

    return NextResponse.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create session."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
