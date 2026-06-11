"use client"

import { X, Bell, CheckCircle2, AlertCircle, MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "update" | "resolved" | "feedback" | "action"
  title: string
  description: string
  time: string
  read: boolean
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "update",
    title: "Update on ST2024-0001234",
    description: "Action is in progress on your complaint.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    type: "resolved",
    title: "Complaint Resolved",
    description: "ST2024-0001122 has been resolved successfully.",
    time: "2 days ago",
    read: false,
  },
  {
    id: "3",
    type: "feedback",
    title: "Survey: Share your feedback",
    description: "Tell us about your experience with...",
    time: "May 20, 2024 • 11:45 AM",
    read: true,
  },
  {
    id: "4",
    type: "action",
    title: "Action In Progress",
    description: "The department has started working on...",
    time: "May 21, 2024 • 09:30 AM",
    read: true,
  },
  {
    id: "5",
    type: "update",
    title: "Pending Resolution",
    description: "Your complaint is being resolved.",
    time: "May 21, 2024 • 09:30 AM",
    read: true,
  },
]

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "update":
      return <Bell className="w-4 h-4" />
    case "resolved":
      return <CheckCircle2 className="w-4 h-4" />
    case "feedback":
      return <MessageSquare className="w-4 h-4" />
    case "action":
      return <Clock className="w-4 h-4" />
  }
}

const getNotificationColor = (type: Notification["type"]) => {
  switch (type) {
    case "update":
      return "bg-blue-100 text-blue-600"
    case "resolved":
      return "bg-green-100 text-green-600"
    case "feedback":
      return "bg-yellow-100 text-yellow-600"
    case "action":
      return "bg-orange-100 text-orange-600"
  }
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {notifications.filter(n => !n.read).length} new
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex gap-3 p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors",
                !notification.read && "bg-primary/5"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                getNotificationColor(notification.type)
              )}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "text-sm",
                    !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>
            View Details
          </Button>
        </div>
      </div>
    </>
  )
}
