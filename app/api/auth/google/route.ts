import { NextRequest, NextResponse } from "next/server"
import { getSupabaseGoogleAuthUrl } from "@/lib/server-data"

export async function GET(request: NextRequest) {
  try {
    return NextResponse.redirect(getSupabaseGoogleAuthUrl(request.nextUrl.origin))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Google sign in."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
