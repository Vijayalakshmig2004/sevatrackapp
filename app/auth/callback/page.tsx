"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Leaf } from "lucide-react"
import { supabaseClient } from "@/lib/supabase-client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Completing secure Google sign in...")

  useEffect(() => {
    const completeSignIn = async () => {
      const query = new URLSearchParams(window.location.search)
      const code = query.get("code")

      if (code) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage(error.message)
          return
        }
      }

      const { data, error } = await supabaseClient.auth.getSession()
      const accessToken = data.session?.access_token

      if (error || !accessToken) {
        setMessage(error?.message || "Google sign in did not return a valid session. Please try again.")
        return
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setMessage(data.error || "Unable to create your SevaTrack session.")
        return
      }

      router.replace("/dashboard")
    }

    completeSignIn()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Leaf className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">SevaTrack</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}
