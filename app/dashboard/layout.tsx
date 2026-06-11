"use client"

import { useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { NotificationsPanel } from "@/components/notifications-panel"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ensureSevaTrackSession } from "@/lib/auth-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  useEffect(() => {
    ensureSevaTrackSession().then((isSignedIn) => {
      if (!isSignedIn) router.replace("/")
    })
  }, [router])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-card">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileSidebar(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-foreground">SevaTrack</span>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header 
            onNotificationsClick={() => setShowNotifications(!showNotifications)}
            notificationCount={3}
          />
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}
