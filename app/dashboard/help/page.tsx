"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search,
  HelpCircle,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "How do I submit a new complaint?",
    answer: "To submit a new complaint, click on 'Submit Grievance' in the sidebar. Fill in the required details including category, location, description, and any supporting evidence. Click 'Review & Submit' to complete your submission."
  },
  {
    question: "How can I track my complaint status?",
    answer: "You can track your complaint by entering your complaint ID in the 'Track Complaint' section. Alternatively, you can view all your complaints in the 'My Complaints' section where you can see the current status and timeline of each complaint."
  },
  {
    question: "What is the expected resolution time?",
    answer: "Resolution time varies based on the type and complexity of the issue. Most complaints are resolved within 7-14 working days. If your complaint is not resolved within the standard timeline, it will be automatically escalated to higher authorities."
  },
  {
    question: "How do I provide feedback on a resolved complaint?",
    answer: "Once your complaint is marked as resolved, you will receive a notification asking for your feedback. You can rate your experience and provide comments through the notification or by visiting the complaint details page."
  },
  {
    question: "Can I withdraw my complaint?",
    answer: "Yes, you can withdraw your complaint at any time before it is resolved. Go to the complaint details page and click on 'Withdraw Complaint'. Please note that withdrawn complaints cannot be reopened."
  },
  {
    question: "How do I update my contact information?",
    answer: "You can update your contact information in the Profile section. Click on 'Profile' in the sidebar, then click 'Edit Profile' to make changes to your name, email, phone number, or address."
  },
]

const categories = [
  {
    title: "Getting Started",
    icon: FileText,
    articles: 5,
  },
  {
    title: "Submitting Complaints",
    icon: HelpCircle,
    articles: 8,
  },
  {
    title: "Tracking & Updates",
    icon: Search,
    articles: 6,
  },
  {
    title: "Account & Settings",
    icon: MessageSquare,
    articles: 4,
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground mt-2">
          Find answers to common questions or contact our support team
        </p>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-border text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Categories */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Card key={category.title} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{category.title}</p>
                  <p className="text-xs text-muted-foreground">{category.articles} articles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground pr-4">{faq.question}</span>
                {expandedFaq === index ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No matching questions found.</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Contact Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Call Us</p>
                <p className="text-sm text-primary">1800-XXX-XXXX</p>
                <p className="text-xs text-muted-foreground">Mon-Sat, 9AM-6PM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email Us</p>
                <p className="text-sm text-primary">support@sevatrack.gov.in</p>
                <p className="text-xs text-muted-foreground">Response in 24hrs</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Live Chat</p>
                <p className="text-sm text-primary">Start a conversation</p>
                <p className="text-xs text-muted-foreground">Available 24/7</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">User Documentation</p>
                <p className="text-sm text-muted-foreground">Comprehensive guides and tutorials</p>
              </div>
            </div>
            <Button variant="outline">
              View Docs
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
