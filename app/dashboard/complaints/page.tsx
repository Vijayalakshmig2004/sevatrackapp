"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Download, Filter, Lock, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Complaint } from "@/lib/server-data"

const getStatusConfig = (status: string) => {
  switch (status) {
    case "in-progress":
    case "assigned":
    case "under-review":
    case "submitted":
      return { label: status.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "), color: "bg-orange-100 text-orange-700", icon: Clock }
    case "resolved":
      return { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle2 }
    case "closed":
      return { label: "Closed", color: "bg-gray-100 text-gray-700", icon: Lock }
    case "escalated":
      return { label: "Escalated", color: "bg-red-100 text-red-700", icon: AlertCircle }
    default:
      return { label: status, color: "bg-gray-100 text-gray-700", icon: AlertCircle }
  }
}

function relativeDate(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.max(1, Math.round(diff / 36e5))
  return hours < 24 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    fetch("/api/complaints")
      .then((response) => response.json())
      .then((data) => setComplaints(data.complaints || []))
  }, [])

  const categories = useMemo(() => Array.from(new Set(complaints.map((complaint) => complaint.category))), [complaints])
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter
    const matchesCategory = categoryFilter === "all" || complaint.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const downloadExport = () => {
    const params = new URLSearchParams()
    if (fromDate) params.set("from", fromDate)
    if (toDate) params.set("to", toDate)
    window.location.href = `/api/complaints/export?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Complaints</h1>
          <p className="text-muted-foreground mt-1">View and manage all your submitted complaints</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" asChild>
          <Link href="/dashboard/submit">
            <Plus className="w-4 h-4 mr-2" />
            New Complaint
          </Link>
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="bg-muted/50 border-border"
                aria-label="Export from date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="bg-muted/50 border-border"
                aria-label="Export to date"
              />
              <Button variant="outline" onClick={downloadExport}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title, or location..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-muted/50 border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 bg-muted/50 border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{filteredComplaints.length} Complaint{filteredComplaints.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredComplaints.map((complaint) => {
              const statusConfig = getStatusConfig(complaint.status)
              return (
                <Link key={complaint.id} href={`/dashboard/complaints/${complaint.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", statusConfig.color)}>
                      <statusConfig.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">{complaint.id}</span>
                        <Badge variant="secondary" className="text-xs">{complaint.category}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{complaint.title}</p>
                      <p className="text-xs text-muted-foreground">{complaint.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right hidden sm:block">
                      <Badge className={cn(statusConfig.color)}>{statusConfig.label}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Updated {relativeDate(complaint.updatedAt)}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>

          {filteredComplaints.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No complaints found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
                setCategoryFilter("all")
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
