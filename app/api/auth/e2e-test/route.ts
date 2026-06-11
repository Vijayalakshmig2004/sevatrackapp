import { NextRequest, NextResponse } from "next/server"
import { ensureAuthenticatedUser, setSession } from "@/lib/server-data"

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-e2e-test-token")
  const expectedToken = process.env.E2E_TEST_TOKEN

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "E2E test login is not enabled." }, { status: 403 })
  }

  const now = Date.now()
  const user = await ensureAuthenticatedUser({
    id: "e2e_test_user",
    email: "sevatrack.e2e.test@example.com",
    user_metadata: {
      full_name: "SevaTrack E2E Tester",
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=SevaTrack%20E2E%20Tester&v=${now}`,
    },
  })

  await setSession(user.id)
  return NextResponse.json({ user })
}
