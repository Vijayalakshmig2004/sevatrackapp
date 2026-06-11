"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  Leaf,
  Users,
  Target,
  Award,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock
} from "lucide-react"

const stats = [
  { label: "Complaint Flow", value: "End-to-end", icon: CheckCircle2 },
  { label: "User Access", value: "Web + APK", icon: Users },
  { label: "Departments", value: "Auto-route", icon: Target },
  { label: "Tracking", value: "Live status", icon: Clock },
]

const features = [
  {
    title: "Easy Submission",
    description: "Submit grievances in minutes with our intuitive form and category selection.",
    icon: Leaf,
  },
  {
    title: "Real-time Tracking",
    description: "Track your complaint status in real-time with detailed timeline updates.",
    icon: TrendingUp,
  },
  {
    title: "Secure & Private",
    description: "Your data is encrypted and protected with industry-standard security.",
    icon: Shield,
  },
  {
    title: "Fast Resolution",
    description: "Automated routing ensures your complaint reaches the right department quickly.",
    icon: Award,
  },
]

const timeline = [
  { year: "2026", event: "SevaTrack interface designed for citizen-friendly grievance reporting" },
  { year: "2026", event: "Supabase database storage added for real complaint records" },
  { year: "2026", event: "Service partner assignment and complaint closure workflow built" },
  { year: "2026", event: "Web app deployed and Android APK prepared for mobile access" },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold text-foreground">SevaTrack</h1>
            <p className="text-muted-foreground">Public Grievance Redressal Portal</p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
          Designed and developed by Vijayalakshmi to deliver what people need: 
          a simple, transparent way to submit civic complaints, assign service partners, and track resolution.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mission */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            SevaTrack was created by Vijayalakshmi to make public grievance redressal easier for citizens.
            The portal helps people register civic problems, attach proof, save the issue location, and follow
            each stage until a service partner completes the work and the complaint is closed.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Why SevaTrack?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card className="bg-card border-border">
        <CardContent className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">Project Journey</h2>
          <div className="relative">
            {timeline.map((item, index) => (
              <div key={index} className="flex gap-6 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    {item.year}
                  </div>
                  {index < timeline.length - 1 && (
                    <div className="w-0.5 flex-1 bg-primary/20 mt-2" />
                  )}
                </div>
                <div className="flex-1 pt-3">
                  <p className="text-foreground">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Get in Touch</h2>
          <p className="text-muted-foreground mb-4">
            Have questions or feedback about SevaTrack? Share it to improve the project.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div>
              <p className="font-medium text-foreground">Email</p>
              <p className="text-primary">contact@sevatrack.app</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Helpline</p>
              <p className="text-primary">Available through portal support</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Address</p>
              <p className="text-muted-foreground">New Delhi, India</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>SevaTrack - Designed and developed by Vijayalakshmi</p>
        <p className="mt-1">Built to deliver what people need</p>
      </div>
    </div>
  )
}
