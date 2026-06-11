"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, Bell, Check, CheckCircle2, Clock, Filter, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/server-data"

const getNotificationIcon = (title: string) => {
  if (title.toLowerCase().includes("resolved")) return CheckCircle2
  if (title.toLowerCase().includes("feedback")) return MessageSquare
  if (title.toLowerCase().includes("assigned")) return Clock
  return AlertCircle
}

function relativeDate(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.max(1, Math.round(diff / 36e5))
  return hours < 24 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState("all")

  const loadNotifications = () => {
    fetch("/api/notifications")
      .then((response) => response.json())
      .then((data) => setNotifications(data.notifications || []))
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const filteredNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.read
    return notification.title.toLowerCase().includes(filter)
  }), [filter, notifications])

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" })
    loadNotifications()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your complaints and important announcements</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40 bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notifications</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
            {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground">{unreadCount} unread</Badge>}
          </div>
        </CardContent>
      </Card>

      {filteredNotifications.length > 0 ? (
        <Card className="bg-card border-border overflow-hidden">
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.title)
              return (
                <div key={notification.id} className={cn("flex gap-4 p-4 transition-colors", !notification.read && "bg-primary/5")}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm", !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground")}>{notification.title}</p>
                        {!notification.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground">{relativeDate(notification.createdAt)}</p>
                      {notification.complaintId && (
                        <Badge variant="secondary" className="text-xs" asChild>
                          <Link href={`/dashboard/complaints/${notification.complaintId}`}>{notification.complaintId}</Link>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No notifications</h3>
            <p className="text-muted-foreground">{filter === "unread" ? "You have no unread notifications" : "You have no notifications yet"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
