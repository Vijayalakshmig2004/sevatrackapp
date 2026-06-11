"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Complaint } from "@/lib/server-data"
import { CheckCircle2, ChevronRight, Clock, ExternalLink, FileText, Lock, Search, Star } from "lucide-react"

function statusLabel(status: string) {
  return status.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")
}

function relativeDate(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.max(1, Math.round(diff / 36e5))
  return hours < 24 ? `Updated ${hours}h ago` : `Updated ${Math.round(hours / 24)}d ago`
}

function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const isClosed = complaint.status === "closed"
  const isResolved = complaint.status === "resolved"
  const color = isClosed ? "bg-gray-100 text-gray-700" : isResolved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"

  return (
    <Link
      href={`/dashboard/complaints/${complaint.id}`}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{complaint.id}</p>
        <p className="text-sm font-semibold text-foreground truncate">{complaint.title}</p>
        <p className="text-xs text-muted-foreground">{complaint.location}</p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Badge className={cn(color, "hover:bg-current/0")}>{statusLabel(complaint.status)}</Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeDate(complaint.updatedAt)}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [trackingId, setTrackingId] = useState("")
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [userName, setUserName] = useState("Citizen")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUserName(data?.user?.name || "Citizen"))
      .catch(() => setUserName("Citizen"))

    fetch("/api/complaints")
      .then((response) => response.json())
      .then((data) => setComplaints(data.complaints || []))
      .finally(() => setIsLoading(false))
  }, [])

  const grouped = useMemo(() => ({
    active: complaints.filter((complaint) => !["resolved", "closed"].includes(complaint.status)),
    resolved: complaints.filter((complaint) => complaint.status === "resolved"),
    closed: complaints.filter((complaint) => complaint.status === "closed"),
  }), [complaints])

  const activeComplaint = complaints[0]
  const stats = [
    { label: "Total Complaints", value: complaints.length, sublabel: "All time", icon: FileText, color: "bg-blue-100 text-blue-600" },
    { label: "In Progress", value: grouped.active.length, sublabel: "Active", icon: Clock, color: "bg-orange-100 text-orange-600" },
    { label: "Resolved", value: grouped.resolved.length, sublabel: "Completed", icon: CheckCircle2, color: "bg-green-100 text-green-600" },
    { label: "Closed", value: grouped.closed.length, sublabel: "Closed", icon: Lock, color: "bg-gray-100 text-gray-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, {userName}!</h1>
          <p className="text-muted-foreground mt-1">Track your complaints or submit a new one.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-1">Track by Complaint ID</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter your complaint ID to see real-time status</p>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g. ST2026-0001234"
                  value={trackingId}
                  onChange={(event) => setTrackingId(event.target.value)}
                  className="flex-1 h-11 bg-muted/50 border-border"
                />
                <Button className="h-11 px-6 bg-primary hover:bg-primary/90" asChild>
                  <Link href={`/dashboard/track${trackingId ? `?id=${encodeURIComponent(trackingId)}` : ""}`}>
                    <Search className="w-4 h-4 mr-2" />
                    Track
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">My Complaints by Status</CardTitle>
              <Link href="/dashboard/complaints" className="text-sm text-primary hover:text-primary/80 font-medium">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading complaints...</p>}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-foreground">In Progress</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">{grouped.active.length}</Badge>
              </div>
              <div className="space-y-2">{grouped.active.map((complaint) => <ComplaintRow key={complaint.id} complaint={complaint} />)}</div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-foreground">Resolved</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">{grouped.resolved.length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped.resolved.map((complaint) => (
                  <div key={complaint.id} className="space-y-2">
                    <ComplaintRow complaint={complaint} />
                    {!complaint.feedback && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5">
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Rate Resolution</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="w-4 h-4 text-muted-foreground/50" />)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-foreground">Closed</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">{grouped.closed.length}</Badge>
              </div>
              <div className="space-y-2">{grouped.closed.map((complaint) => <ComplaintRow key={complaint.id} complaint={complaint} />)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Complaint Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">{activeComplaint?.id || "No complaint selected"}</p>
              </div>
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">{activeComplaint ? statusLabel(activeComplaint.status) : "Empty"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {(activeComplaint?.timeline || []).map((step, index) => (
                <div key={step.title} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-3 h-3 rounded-full border-2", step.completed ? "bg-primary border-primary" : "bg-background border-muted-foreground")} />
                    {index < (activeComplaint?.timeline.length || 0) - 1 && (
                      <div className={cn("w-0.5 flex-1 mt-1", step.completed ? "bg-primary" : "bg-muted")} />
                    )}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <p className={cn("text-sm font-semibold", step.completed ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href={activeComplaint ? `/dashboard/complaints/${activeComplaint.id}` : "/dashboard/complaints"}>
                View Details
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
