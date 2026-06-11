"use client"

import { supabaseClient } from "@/lib/supabase-client"

export async function ensureSevaTrackSession() {
  const currentSession = await fetch("/api/me")
  if (currentSession.ok) return true

  const { data } = await supabaseClient.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) return false

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  })

  return response.ok
}
