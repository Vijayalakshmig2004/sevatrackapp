"use client"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Calendar, CheckCircle2, Clock, Download, ExternalLink, FileText, ImageIcon, MapPin, MessageSquare, Phone, Star, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Complaint } from "@/lib/server-data"

function statusLabel(status: string) {
  return status.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
}

function extractGps(location: string) {
  const match = location.match(/GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return { lat: 28.5494, lng: 77.2389 }
  return { lat: Number(match[1]), lng: Number(match[2]) }
}

function cleanLocation(location: string) {
  return location.split("| GPS:")[0].trim()
}

function osmUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
}

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [message, setMessage] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/complaints/${id}`)
      .then((response) => response.json())
      .then((data) => setComplaint(data.complaint || null))
  }, [id])

  const submitFeedback = async () => {
    if (!rating) {
      setMessage("Please choose a rating first.")
      return
    }
    const response = await fetch(`/api/complaints/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    })
    const data = await response.json()
    if (response.ok) {
      setComplaint(data.complaint)
      setMessage("Thanks, your feedback was submitted.")
    } else {
      setMessage(data.error || "Unable to submit feedback.")
    }
  }

  const updateWorkflow = async (action: "assign" | "complete" | "close") => {
    setIsUpdating(true)
    setMessage("")
    const response = await fetch(`/api/complaints/${id}/${action}`, { method: "POST" })
    const data = await response.json()
    if (response.ok) {
      setComplaint(data.complaint)
      setMessage(
        action === "assign"
          ? "Service partner assigned successfully."
          : action === "complete"
            ? "Problem marked as completed by service partner."
            : "Complaint closed successfully.",
      )
    } else {
      setMessage(data.error || "Unable to update complaint.")
    }
    setIsUpdating(false)
  }

  const downloadReport = () => {
    if (!complaint) return
    const report = [
      "SEVATRACK COMPLAINT RESOLUTION REPORT",
      "",
      `Complaint ID: ${complaint.id}`,
      `Title: ${complaint.title}`,
      `Category: ${complaint.category}`,
      `Status: ${statusLabel(complaint.status)}`,
      `Location: ${complaint.location}`,
      `Department: ${complaint.department}`,
      `Submitted: ${formatDate(complaint.submittedAt)}`,
      `Description: ${complaint.description}`,
      "",
      "Service Partner",
      complaint.servicePartner
        ? `${complaint.servicePartner.name} | ${complaint.servicePartner.id} | ${complaint.servicePartner.phone} | Vehicle: ${complaint.servicePartner.vehicleNo}`
        : "Not assigned",
      "",
      "Timeline",
      ...complaint.timeline.map((step) => `- ${step.title}: ${step.description} (${step.date})`),
    ].join("\\n")

    const blob = new Blob([report], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${complaint.id}-report.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!complaint) {
    return <div className="text-muted-foreground">Loading complaint...</div>
  }

  const canRate = complaint.status === "resolved" && !complaint.feedback
  const gps = extractGps(complaint.location)
  const displayLocation = cleanLocation(complaint.location)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/complaints">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{complaint.id}</h1>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">{statusLabel(complaint.status)}</Badge>
          </div>
          <p className="text-muted-foreground">{complaint.title}</p>
        </div>
        <Button variant="outline" className="hidden sm:flex">
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Complaint Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Category", value: complaint.category, icon: FileText },
                  { label: "Department", value: complaint.department, icon: Building2 },
                  { label: "Location", value: displayLocation, icon: MapPin },
                  { label: "Submitted", value: formatDate(complaint.submittedAt), icon: Calendar },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-2">Description</p>
                <p className="text-sm text-muted-foreground">{complaint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Evidence Uploaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {complaint.evidence.map((item) => (
                  <div key={item.id} className="w-24 h-24 rounded-xl bg-muted border border-border flex flex-col items-center justify-center">
                    {item.type === "image" ? <ImageIcon className="w-8 h-8 text-primary/50 mb-1" /> : <FileText className="w-8 h-8 text-destructive/50 mb-1" />}
                    <span className="text-xs text-muted-foreground truncate w-full text-center px-1">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border bg-muted">
                <div className="flex flex-col gap-2 border-b border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Door-step service location</p>
                    <p className="text-xs text-muted-foreground">{displayLocation}</p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    GPS {gps.lat}, {gps.lng}
                  </Badge>
                </div>
                <iframe
                  title="Complaint service location map"
                  src={osmUrl(gps.lat, gps.lng)}
                  className="h-56 w-full border-0"
                  loading="lazy"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                The assigned service partner can use this saved location to reach the citizen address.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {complaint.timeline.map((step, index) => (
                <div key={step.title} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-3 h-3 rounded-full border-2", step.completed ? "bg-primary border-primary" : "bg-background border-muted-foreground")} />
                    {index < complaint.timeline.length - 1 && <div className={cn("w-0.5 flex-1 mt-1", step.completed ? "bg-primary" : "bg-muted")} />}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <p className={cn("text-sm font-semibold", step.completed ? "text-foreground" : "text-muted-foreground")}>{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{step.date}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Service Partner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {complaint.servicePartner ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{complaint.servicePartner.name}</p>
                      <p className="text-xs text-muted-foreground">{complaint.servicePartner.id} • {complaint.servicePartner.vehicleNo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {complaint.servicePartner.phone}
                  </div>
                  <p className="text-sm text-muted-foreground">Expected door-step visit: {complaint.servicePartner.eta}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No service partner assigned yet.</p>
              )}

              {!complaint.servicePartner && (
                <Button className="w-full bg-primary hover:bg-primary/90" disabled={isUpdating} onClick={() => updateWorkflow("assign")}>
                  <Truck className="w-4 h-4 mr-2" />
                  Assign Service Partner
                </Button>
              )}
              {complaint.servicePartner && !["resolved", "closed"].includes(complaint.status) && (
                <Button className="w-full bg-primary hover:bg-primary/90" disabled={isUpdating} onClick={() => updateWorkflow("complete")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Problem Completed
                </Button>
              )}
              {complaint.status === "resolved" && (
                <Button className="w-full bg-primary hover:bg-primary/90" disabled={isUpdating} onClick={() => updateWorkflow("close")}>
                  Close Complaint
                </Button>
              )}
              {["resolved", "closed"].includes(complaint.status) && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
                  <Link href={`/dashboard/complaints/${complaint.id}/payment`}>
                    Make Payment
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-600">Escalates on {formatDate(complaint.escalationDueAt)}</p>
                  <p className="text-xs text-muted-foreground">If not resolved within timeline</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canRate && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Rate Your Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">How satisfied are you with the resolution?</p>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} className="p-1 hover:scale-110 transition-transform" onClick={() => setRating(star)}>
                      <Star className={cn("w-8 h-8", rating >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="Add a short comment..." value={comment} onChange={(event) => setComment(event.target.value)} className="mb-4" />
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={submitFeedback}>Submit Feedback</Button>
              </CardContent>
            </Card>
          )}

          {message && <p className="text-sm text-primary">{message}</p>}
          <Button variant="outline" className="w-full" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Share Status Link
          </Button>
        </div>
      </div>
    </div>
  )
}
