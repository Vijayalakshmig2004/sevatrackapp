"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Building2, Calendar, CheckCircle2, Clock, MapPin, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Complaint } from "@/lib/server-data"

function statusLabel(status: string) {
  return status.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
}

function TrackPageContent() {
  const searchParams = useSearchParams()
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "")
  const [result, setResult] = useState<Complaint | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")

  const handleTrack = async (id = trackingId) => {
    if (!id.trim()) {
      setError("Please enter a complaint ID")
      return
    }
    setError("")
    setIsSearching(true)
    const response = await fetch(`/api/track/${encodeURIComponent(id.trim())}`)
    const data = await response.json()
    if (response.ok) {
      setResult(data.complaint)
    } else {
      setError("No complaint found with this ID. Please check and try again.")
      setResult(null)
    }
    setIsSearching(false)
  }

  useEffect(() => {
    const id = searchParams.get("id")
    if (id) handleTrack(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Track Your Complaint</h1>
        <p className="text-muted-foreground mt-2">Enter your complaint ID to see the current status and timeline</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter Complaint ID (e.g., ST2026-0001234)"
                value={trackingId}
                onChange={(event) => {
                  setTrackingId(event.target.value)
                  setError("")
                }}
                onKeyDown={(event) => event.key === "Enter" && handleTrack()}
                className="pl-10 h-12 bg-muted/50 border-border text-base"
              />
            </div>
            <Button onClick={() => handleTrack()} className="h-12 px-8 bg-primary hover:bg-primary/90" disabled={isSearching}>
              {isSearching ? "Searching..." : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Track
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <p className="text-xs text-muted-foreground mt-4">Your complaint ID was provided when you submitted your grievance.</p>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-primary/5 p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complaint ID</p>
                <p className="text-lg font-bold text-foreground">{result.id}</p>
              </div>
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                <Clock className="w-3 h-3 mr-1" />
                {statusLabel(result.status)}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">{result.title}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Location", value: result.location, icon: MapPin },
                  { label: "Department", value: result.department, icon: Building2 },
                  { label: "Submitted", value: formatDate(result.submittedAt), icon: Calendar },
                  { label: "Last Update", value: formatDate(result.updatedAt), icon: Clock },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <h4 className="font-semibold text-foreground mb-4">Progress Timeline</h4>
              <div className="flex items-center justify-between">
                {result.timeline.map((step, index) => (
                  <div key={step.title} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", step.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />}
                      </div>
                      <p className={cn("text-xs text-center mt-2 max-w-20", step.completed ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
                    </div>
                    {index < result.timeline.length - 1 && <div className={cn("w-8 lg:w-16 h-0.5 mb-6", step.completed ? "bg-primary" : "bg-muted")} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button className="flex-1 bg-primary hover:bg-primary/90" asChild>
                <Link href={`/dashboard/complaints/${result.id}`}>
                  View Full Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" className="flex-1">Contact Support</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading tracker...</div>}>
      <TrackPageContent />
    </Suspense>
  )
}
