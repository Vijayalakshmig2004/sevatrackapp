"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  Lock,
  Camera,
  FileText,
  CheckCircle2,
  Clock
} from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profile, setProfile] = useState({
    name: "Citizen",
    email: "",
    phone: "",
    address: "",
  })
  const [complaintStats, setComplaintStats] = useState({
    total: 0,
    resolved: 0,
    active: 0,
  })

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  })

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.user) return
        setProfile((current) => ({
          ...current,
          name: data.user.name || "Citizen",
          email: data.user.email || "",
        }))
        setAvatarUrl(data.user.avatarUrl || "")
      })
      .catch(() => null)

    fetch("/api/complaints")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const complaints = data?.complaints || []
        setComplaintStats({
          total: complaints.length,
          resolved: complaints.filter((item: { status: string }) => item.status === "resolved" || item.status === "closed").length,
          active: complaints.filter((item: { status: string }) => !["resolved", "closed"].includes(item.status)).length,
        })
      })
      .catch(() => null)
  }, [])

  const initials = profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CT"
  const stats = [
    { label: "Total Complaints", value: complaintStats.total, icon: FileText },
    { label: "Resolved", value: complaintStats.resolved, icon: CheckCircle2 },
    { label: "In Progress", value: complaintStats.active, icon: Clock },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <Badge className="mt-3 bg-primary/10 text-primary hover:bg-primary/10">
                <Shield className="w-3 h-3 mr-1" />
                Verified User
              </Badge>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{stat.label}</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!isEditing}
                    className="bg-muted/50 border-border disabled:opacity-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled={!isEditing}
                    className="bg-muted/50 border-border disabled:opacity-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    disabled={!isEditing}
                    className="bg-muted/50 border-border disabled:opacity-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    disabled={!isEditing}
                    className="bg-muted/50 border-border disabled:opacity-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive push notifications on your device</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
