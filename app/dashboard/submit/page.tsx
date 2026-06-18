"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Trash2, 
  Lightbulb, 
  Droplets, 
  Route,
  MoreHorizontal,
  MapPin,
  Upload,
  X,
  Shield,
  HelpCircle,
  Clock,
  ChevronRight,
  Building2,
  ImageIcon,
  FileText,
  LocateFixed
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ensureSevaTrackSession } from "@/lib/auth-client"

const categories = [
  { id: "sanitation", label: "Sanitation", icon: Trash2, color: "bg-green-100 text-green-700" },
  { id: "water", label: "Water Supply", icon: Droplets, color: "bg-blue-100 text-blue-700" },
  { id: "roads", label: "Roads & Footpaths", icon: Route, color: "bg-orange-100 text-orange-700" },
  { id: "lighting", label: "Street Lighting", icon: Lightbulb, color: "bg-yellow-100 text-yellow-700" },
  { id: "other", label: "Other", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700" },
]

const steps = [
  { id: 1, label: "Category", sublabel: "What is the issue?" },
  { id: 2, label: "Location", sublabel: "Where did it happen?" },
  { id: 3, label: "Details", sublabel: "Tell us more" },
  { id: 4, label: "Evidence", sublabel: "Upload supporting proof" },
  { id: 5, label: "Review", sublabel: "Confirm & submit" },
]

interface UploadedFile {
  id: string
  name: string
  type: "image" | "document"
  preview?: string
  size: string
}

export default function SubmitGrievancePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState("sanitation")
  const [location, setLocation] = useState("Sector 12, Green Park, New Delhi")
  const [coordinates, setCoordinates] = useState({ lat: 28.5494, lng: 77.2389 })
  const [description, setDescription] = useState("Garbage bin is overflowing for the past 3 days. It's causing bad smell and unhygienic conditions.")
  const [urgency, setUrgency] = useState<"Normal" | "Urgent" | "Emergency">("Normal")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { id: "1", name: "IMG_001.jpg", type: "image", preview: "/placeholder.svg?height=100&width=100", size: "2.4 MB" },
    { id: "2", name: "IMG_002.jpg", type: "image", preview: "/placeholder.svg?height=100&width=100", size: "1.8 MB" },
    { id: "3", name: "Bill.pdf", type: "document", size: "1.2 MB" },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng - 0.01}%2C${coordinates.lat - 0.01}%2C${coordinates.lng + 0.01}%2C${coordinates.lat + 0.01}&layer=mapnik&marker=${coordinates.lat}%2C${coordinates.lng}`

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "document",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Upload files to the backend to avoid 404 / rejection
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || "File upload rejected")
        }
      } catch (err) {
        setError("File upload failed.")
      }
    }
  }

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id))
  }

  const useLiveLocation = () => {
    setError("")
    if (!navigator.geolocation) {
      setError("Live location is not supported in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6))
        const lng = Number(position.coords.longitude.toFixed(6))
        setCoordinates({ lat, lng })
        setLocation(`Current GPS location (${lat}, ${lng})`)
      },
      () => setError("Unable to access live location. Please allow location permission or enter the address manually."),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const getDepartment = () => {
    const category = categories.find(c => c.id === selectedCategory)
    if (!category) return "General Department"
    switch (category.id) {
      case "sanitation": return "Sanitation Department"
      case "water": return "Water Supply Department"
      case "roads": return "Roads & Infrastructure"
      case "lighting": return "Electrical Department"
      default: return "General Department"
    }
  }

  const selectedCategoryLabel = categories.find((category) => category.id === selectedCategory)?.label || "Other"

  const handleSubmit = async () => {
    setError("")
    if (!selectedCategoryLabel || !location.trim() || !description.trim()) {
      setError("Please choose a category, location, and description before submitting.")
      return
    }

    setIsSubmitting(true)
    try {
      const hasSession = await ensureSevaTrackSession()
      if (!hasSession) {
        throw new Error("Please sign in with Google again before submitting a complaint.")
      }

      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${selectedCategoryLabel} issue`,
          category: selectedCategoryLabel,
          location: coordinates ? `${location} | GPS: ${coordinates.lat}, ${coordinates.lng}` : location,
          description,
          urgency,
          evidence: uploadedFiles.map(({ id, name, type, size }) => ({ id, name, type, size })),
        }),
      })
      const text = await response.text()
      const data = text ? JSON.parse(text) : {}
      if (!response.ok) throw new Error(data.error || "Unable to submit complaint")
      router.push(`/dashboard/complaints/${data.complaint.id}`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to submit complaint"
      setError(message.includes("JSON") ? "The server returned an invalid response. Please redeploy the latest app and check Supabase environment variables." : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Submit Grievance</h1>
            <p className="text-muted-foreground mt-1">
              {"Fill in the details below. We'll guide you at every step."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary">Your information is secure and will only be used to resolve your complaint.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left - Form */}
        <div className="flex-1">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              {/* Progress Steps */}
              <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap",
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        currentStep === step.id
                          ? "bg-primary-foreground text-primary"
                          : currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {step.id}
                      </div>
                      <span className="text-sm font-medium">{step.label}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="space-y-6">
                {/* Step 1: Category */}
                <div>
                  <Label className="text-base font-semibold text-foreground">
                    1. What is the issue about?
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Choose the category that best describes your concern.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                          selectedCategory === category.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", category.color)}>
                          <category.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground text-center">{category.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Location */}
                <div>
                  <Label className="text-base font-semibold text-foreground">
                    2. Where did it happen?
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Search for the location or drop a pin on the map.
                  </p>
                  <div className="relative mb-4">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Search for location..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10 h-11 bg-muted/50 border-border"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setLocation("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border bg-muted">
                    <div className="flex flex-col gap-3 border-b border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Live map pin</p>
                        <p className="text-xs text-muted-foreground">
                          {coordinates.lat}, {coordinates.lng}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={useLiveLocation}>
                        <LocateFixed className="mr-2 h-4 w-4" />
                        Use Live Location
                      </Button>
                    </div>
                    <iframe
                      title="Complaint location map"
                      src={mapUrl}
                      className="h-56 w-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Step 3: Details */}
                <div>
                  <Label className="text-base font-semibold text-foreground">
                    3. Tell us more about the issue
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Provide a short description of the problem.
                  </p>
                  <Textarea
                    placeholder="Describe the issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-28 bg-muted/50 border-border resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {description.length} / 500 characters
                  </p>
                </div>

                <div>
                  <Label className="text-base font-semibold text-foreground">
                    Urgency level
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Choose how quickly this issue needs attention.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["Normal", "Urgent", "Emergency"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                          urgency === level ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 4: Evidence */}
                <div>
                  <Label className="text-base font-semibold text-foreground">
                    4. Upload evidence <span className="font-normal text-muted-foreground">(optional but helpful)</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Add photos or documents that support your complaint.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="relative group"
                      >
                        {file.type === "image" ? (
                          <div className="w-24 h-24 rounded-xl bg-muted border border-border overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-primary/50" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-muted border border-border flex flex-col items-center justify-center p-2">
                            <FileText className="w-8 h-8 text-destructive mb-1" />
                            <span className="text-xs text-muted-foreground truncate w-full text-center">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{file.size}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-primary" />
                      <span className="text-xs text-primary font-medium">Add Photo</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG (Max 5MB)</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button variant="outline" className="px-6">
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>You can track your complaint after submission.</span>
                  </div>
                  <Button className="px-6 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Review & Submit"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Preview Panel */}
        <div className="hidden lg:block w-80">
          <div className="sticky top-24 space-y-4">
            {/* Department Preview */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Department Preview</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Auto-assigned to</p>
                    <p className="text-sm text-primary font-medium">{getDepartment()}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on issue category and location.
                </p>
              </CardContent>
            </Card>

            {/* Escalation Preview */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Escalation Preview</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-600">Escalates in 2 days</p>
                    <p className="text-xs text-muted-foreground">If not resolved within the standard timeline.</p>
                  </div>
                </div>
                <Button variant="link" className="h-auto p-0 text-primary text-sm">
                  Learn more
                </Button>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Need help?</p>
                    <p className="text-xs text-muted-foreground">Our support team is here to assist you.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Help & Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
