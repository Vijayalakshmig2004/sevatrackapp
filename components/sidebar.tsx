"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  FileText,
  PlusCircle,
  Search,
  Bell,
  User,
  HelpCircle,
  Info,
  Leaf,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Complaints", href: "/dashboard/complaints", icon: FileText },
  { name: "Submit Grievance", href: "/dashboard/submit", icon: PlusCircle },
  { name: "Track Complaint", href: "/dashboard/track", icon: Search },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 3 },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
  { name: "About SevaTrack", href: "/dashboard/about", icon: Info },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SevaTrack</h1>
            <p className="text-xs text-muted-foreground">Public Grievance Redressal Portal</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
              {item.badge && (
                <Badge 
                  className={cn(
                    "ml-auto h-5 min-w-5 flex items-center justify-center text-xs",
                    isActive 
                      ? "bg-primary-foreground text-primary" 
                      : "bg-destructive text-destructive-foreground"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border space-y-4">
        {/* New User Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary">New to SevaTrack?</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Sign in securely with your Google account
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-card border-primary/20 text-primary hover:bg-primary/10"
              asChild
            >
              <Link href="/api/auth/google">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </Link>
            </Button>
          </div>
        </div>

        {/* Feedback */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">We value your feedback</p>
            <p className="text-xs text-muted-foreground">Help us improve SevaTrack</p>
          </div>
        </div>

        {/* Logout */}
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </Link>
      </div>
    </aside>
  )
}
