import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

export type ComplaintStatus = "submitted" | "under-review" | "assigned" | "in-progress" | "resolved" | "closed" | "escalated"

export type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: "citizen" | "officer" | "admin"
  provider: "google" | "email" | "google-demo" | "email-demo"
}

export type Evidence = {
  id: string
  name: string
  type: "image" | "video" | "document"
  size: string
}

export type ServicePartner = {
  id: string
  name: string
  phone: string
  department: string
  vehicleNo: string
  eta: string
}

export type TimelineEvent = {
  title: string
  description: string
  date: string
  completed: boolean
}

export type Complaint = {
  id: string
  userId: string
  title: string
  category: string
  location: string
  description: string
  department: string
  urgency: "Normal" | "Urgent" | "Emergency"
  status: ComplaintStatus
  submittedAt: string
  updatedAt: string
  slaDueAt: string
  escalationDueAt: string
  servicePartner?: ServicePartner
  serviceCompletedAt?: string
  closedAt?: string
  evidence: Evidence[]
  timeline: TimelineEvent[]
  feedback?: {
    rating: number
    comment: string
    submittedAt: string
  }
}

export type Notification = {
  id: string
  userId: string
  title: string
  message: string
  createdAt: string
  read: boolean
  complaintId?: string
}

type Database = {
  users: User[]
  complaints: Complaint[]
  notifications: Notification[]
  servicePartners: ServicePartner[]
}

const dataDir = path.join(process.cwd(), "data")
const dataFile = path.join(dataDir, "db.json")
const sessionCookie = "sevatrack_session"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isSupabaseConfigured() {
  if (process.env.DISABLE_SUPABASE === "true") return false
  return Boolean(supabaseUrl && supabaseServiceKey && supabaseServiceKey !== "your_service_role_or_secret_key_here")
}

const demoUser: User = {
  id: "user_neha",
  name: "Neha Sharma",
  email: "neha.sharma@gmail.com",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha",
  role: "citizen",
  provider: "google-demo",
}

function formatDate(date: Date) {
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function createSeedComplaint(id: string, title: string, category: string, location: string, status: ComplaintStatus, daysAgo: number): Complaint {
  const submitted = new Date()
  submitted.setDate(submitted.getDate() - daysAgo)
  const updated = new Date()
  updated.setDate(updated.getDate() - Math.max(daysAgo - 1, 0))
  const department = getDepartment(category)

  return {
    id,
    userId: demoUser.id,
    title,
    category,
    location,
    description: `${title} reported near ${location}. Please inspect and resolve the issue.`,
    department,
    urgency: "Normal",
    status,
    submittedAt: submitted.toISOString(),
    updatedAt: updated.toISOString(),
    slaDueAt: daysFromNow(status === "resolved" || status === "closed" ? -1 : 5),
    escalationDueAt: daysFromNow(status === "resolved" || status === "closed" ? -1 : 2),
    evidence: [
      { id: `${id}-e1`, name: "photo-evidence.jpg", type: "image", size: "2.4 MB" },
    ],
    timeline: buildTimeline(status, department, submitted),
  }
}

function initialDb(): Database {
  const servicePartners: ServicePartner[] = [
    { id: "SP-SAN-102", name: "Ravi Kumar", phone: "+91 98765 43210", department: "Sanitation Department", vehicleNo: "DL-01-SV-2045", eta: "Today, 4:30 PM" },
    { id: "SP-WAT-118", name: "Meera Singh", phone: "+91 98765 43211", department: "Water Supply Department", vehicleNo: "DL-01-WT-7712", eta: "Today, 5:15 PM" },
    { id: "SP-RDS-091", name: "Arjun Patel", phone: "+91 98765 43212", department: "Roads & Infrastructure", vehicleNo: "DL-01-RD-5590", eta: "Tomorrow, 10:00 AM" },
    { id: "SP-ELE-047", name: "Farhan Ali", phone: "+91 98765 43213", department: "Electrical Department", vehicleNo: "DL-01-EL-1830", eta: "Today, 6:00 PM" },
    { id: "SP-GEN-011", name: "Kavita Rao", phone: "+91 98765 43214", department: "General Department", vehicleNo: "DL-01-GN-3451", eta: "Tomorrow, 11:30 AM" },
  ]

  return {
    users: [demoUser],
    complaints: [
      createSeedComplaint("ST2026-0001234", "Overflowing Garbage Bin", "Sanitation", "Sector 12, Green Park", "in-progress", 2),
      createSeedComplaint("ST2026-0001187", "Broken Street Light", "Street Lighting", "R.K. Puram, New Delhi", "assigned", 3),
      createSeedComplaint("ST2026-0001122", "Pothole on Main Road", "Roads & Footpaths", "Lajpat Nagar, New Delhi", "resolved", 6),
      createSeedComplaint("ST2026-0000987", "Water Leakage", "Water Supply", "Kailash Colony, New Delhi", "closed", 10),
    ],
    notifications: [
      {
        id: "notif_1",
        userId: demoUser.id,
        title: "Complaint assigned",
        message: "ST2026-0001234 was assigned to Sanitation Department.",
        createdAt: new Date().toISOString(),
        read: false,
        complaintId: "ST2026-0001234",
      },
      {
        id: "notif_2",
        userId: demoUser.id,
        title: "Resolution feedback requested",
        message: "Please rate the resolution for ST2026-0001122.",
        createdAt: daysFromNow(-1),
        read: false,
        complaintId: "ST2026-0001122",
      },
    ],
    servicePartners,
  }
}

type UserRow = {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  role: User["role"]
  provider: User["provider"]
}

type ServicePartnerRow = {
  id: string
  name: string
  phone: string
  department: string
  vehicle_no: string
  eta: string
}

type ComplaintRow = {
  id: string
  user_id: string
  title: string
  category: string
  location: string
  description: string
  department: string
  urgency: Complaint["urgency"]
  status: ComplaintStatus
  submitted_at: string
  updated_at: string
  sla_due_at: string
  escalation_due_at: string
  service_partner?: ServicePartner | null
  service_completed_at?: string | null
  closed_at?: string | null
  evidence?: Evidence[] | null
  timeline?: TimelineEvent[] | null
  feedback?: Complaint["feedback"] | null
}

type NotificationRow = {
  id: string
  user_id: string
  title: string
  message: string
  created_at: string
  read: boolean
  complaint_id?: string | null
}

type SupabaseAuthUser = {
  id: string
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    name?: string
  }
}

async function supabaseRequest<T>(table: string, init?: RequestInit & { query?: string }) {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase is not configured.")
  const query = init?.query ?? ""
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    ...init,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Supabase ${table} request failed: ${message}`)
  }

  if (response.status === 204) return null as T
  const text = await response.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}

export function getSupabaseGoogleAuthUrl(origin: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public URL or anon key is missing.")
  }

  const redirectTo = `${origin}/auth/callback`
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
  })

  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`
}

export async function getSupabaseUserFromAccessToken(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public URL or anon key is missing.")
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Supabase auth verification failed: ${message}`)
  }

  return response.json() as Promise<SupabaseAuthUser>
}

function fromUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role,
    provider: row.provider,
  }
}

function toUserRow(user: User): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatarUrl ?? null,
    role: user.role,
    provider: user.provider,
  }
}

function fromServicePartnerRow(row: ServicePartnerRow): ServicePartner {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    department: row.department,
    vehicleNo: row.vehicle_no,
    eta: row.eta,
  }
}

function toServicePartnerRow(partner: ServicePartner): ServicePartnerRow {
  return {
    id: partner.id,
    name: partner.name,
    phone: partner.phone,
    department: partner.department,
    vehicle_no: partner.vehicleNo,
    eta: partner.eta,
  }
}

function fromComplaintRow(row: ComplaintRow): Complaint {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    location: row.location,
    description: row.description,
    department: row.department,
    urgency: row.urgency,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    slaDueAt: row.sla_due_at,
    escalationDueAt: row.escalation_due_at,
    servicePartner: row.service_partner ?? undefined,
    serviceCompletedAt: row.service_completed_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    evidence: row.evidence ?? [],
    timeline: row.timeline ?? [],
    feedback: row.feedback ?? undefined,
  }
}

function toComplaintRow(complaint: Complaint): ComplaintRow {
  return {
    id: complaint.id,
    user_id: complaint.userId,
    title: complaint.title,
    category: complaint.category,
    location: complaint.location,
    description: complaint.description,
    department: complaint.department,
    urgency: complaint.urgency,
    status: complaint.status,
    submitted_at: complaint.submittedAt,
    updated_at: complaint.updatedAt,
    sla_due_at: complaint.slaDueAt,
    escalation_due_at: complaint.escalationDueAt,
    service_partner: complaint.servicePartner ?? null,
    service_completed_at: complaint.serviceCompletedAt ?? null,
    closed_at: complaint.closedAt ?? null,
    evidence: complaint.evidence ?? null,
    timeline: complaint.timeline ?? null,
    feedback: complaint.feedback ?? null,
  }
}

function fromNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    read: row.read,
    complaintId: row.complaint_id ?? undefined,
  }
}

function toNotificationRow(notification: Notification): NotificationRow {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    message: notification.message,
    created_at: notification.createdAt,
    read: notification.read,
    complaint_id: notification.complaintId ?? null,
  }
}

async function readSupabaseDb(): Promise<Database> {
  const [users, complaints, notifications, servicePartners] = await Promise.all([
    supabaseRequest<UserRow[]>("users", { query: "?select=*" }),
    supabaseRequest<ComplaintRow[]>("complaints", { query: "?select=*" }),
    supabaseRequest<NotificationRow[]>("notifications", { query: "?select=*" }),
    supabaseRequest<ServicePartnerRow[]>("service_partners", { query: "?select=*" }),
  ])

  const db = {
    users: users.map(fromUserRow),
    complaints: complaints.map(fromComplaintRow),
    notifications: notifications.map(fromNotificationRow),
    servicePartners: servicePartners.map(fromServicePartnerRow),
  }

  if (db.servicePartners.length === 0) {
    db.servicePartners = initialDb().servicePartners
    await writeSupabaseDb(db)
  }

  return db
}

async function upsertSupabase<T>(table: string, rows: T[]) {
  if (rows.length === 0) return
  await supabaseRequest(table, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  })
}

async function writeSupabaseDb(db: Database) {
  await upsertSupabase("users", db.users.map(toUserRow))
  await upsertSupabase("service_partners", db.servicePartners.map(toServicePartnerRow))
  await upsertSupabase("complaints", db.complaints.map(toComplaintRow))
  await upsertSupabase("notifications", db.notifications.map(toNotificationRow))
}

export function getDepartment(category: string) {
  switch (category) {
    case "Sanitation":
      return "Sanitation Department"
    case "Water Supply":
      return "Water Supply Department"
    case "Roads & Footpaths":
      return "Roads & Infrastructure"
    case "Street Lighting":
      return "Electrical Department"
    default:
      return "General Department"
  }
}

export function buildTimeline(status: ComplaintStatus, department: string, submittedAt = new Date()) {
  const submitted = new Date(submittedAt)
  const underReview = new Date(submitted)
  underReview.setHours(underReview.getHours() + 1)
  const assigned = new Date(submitted)
  assigned.setHours(assigned.getHours() + 2)
  const progress = new Date(submitted)
  progress.setDate(progress.getDate() + 1)
  const resolved = new Date(submitted)
  resolved.setDate(resolved.getDate() + 3)

  const statusOrder: ComplaintStatus[] = ["submitted", "under-review", "assigned", "in-progress", "resolved", "closed"]
  const currentIndex = statusOrder.indexOf(status)

  return [
    {
      title: "Complaint Registered",
      description: "Your complaint has been successfully registered.",
      date: formatDate(submitted),
      completed: currentIndex >= 0,
    },
    {
      title: "Under Review",
      description: "We are reviewing your complaint.",
      date: formatDate(underReview),
      completed: currentIndex >= 1,
    },
    {
      title: "Assigned to Department",
      description: `Auto-assigned to ${department}.`,
      date: formatDate(assigned),
      completed: currentIndex >= 2,
    },
    {
      title: "Action In Progress",
      description: "The department has started working on it.",
      date: formatDate(progress),
      completed: currentIndex >= 3,
    },
    {
      title: status === "closed" ? "Complaint Closed" : "Resolution",
      description: status === "closed" ? "The complaint has been closed." : "Your complaint is being resolved.",
      date: formatDate(resolved),
      completed: currentIndex >= 4,
    },
  ]
}

export function getServicePartner(db: Database, department: string) {
  return db.servicePartners.find((partner) => partner.department === department) ?? db.servicePartners[0]
}

export function appendTimeline(complaint: Complaint, title: string, description: string, completed = true) {
  complaint.timeline.push({
    title,
    description,
    date: formatDate(new Date()),
    completed,
  })
}

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(dataFile)
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(initialDb(), null, 2))
  }
}

async function readLocalDb(): Promise<Database> {
  await ensureDb()
  const raw = await fs.readFile(dataFile, "utf8")
  const db = JSON.parse(raw) as Database
  if (!db.servicePartners) {
    const seeded = initialDb()
    db.servicePartners = seeded.servicePartners
    await writeDb(db)
  }
  return db
}

export async function readDb(): Promise<Database> {
  if (isSupabaseConfigured()) {
    return readSupabaseDb()
  }

  return readLocalDb()
}

export async function writeDb(db: Database) {
  if (isSupabaseConfigured()) {
    await writeSupabaseDb(db)
    return
  }

  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2))
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(sessionCookie)?.value
  if (!userId) return null
  const db = await readDb()
  return db.users.find((user) => user.id === userId) ?? null
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(sessionCookie, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(sessionCookie)
}

export async function ensureDemoUser() {
  const db = await readDb()
  const existing = db.users.find((user) => user.id === demoUser.id)
  if (!existing) {
    db.users.push(demoUser)
    await writeDb(db)
  }
  return demoUser
}

export async function ensureAuthenticatedUser(authUser: SupabaseAuthUser) {
  const email = authUser.email
  if (!email) throw new Error("Google account did not return an email address.")

  const db = await readDb()
  const metadata = authUser.user_metadata ?? {}
  const name = metadata.full_name || metadata.name || email.split("@")[0]
  const user: User = {
    id: authUser.id,
    name,
    email,
    avatarUrl: metadata.avatar_url,
    role: "citizen",
    provider: "google",
  }

  const existingIndex = db.users.findIndex((item) => item.id === user.id || item.email === user.email)
  if (existingIndex >= 0) {
    db.users[existingIndex] = { ...db.users[existingIndex], ...user }
  } else {
    db.users.push(user)
  }

  await writeDb(db)
  return user
}

export function generateComplaintId(existingIds: string[]) {
  const year = new Date().getFullYear()
  let number = existingIds.length + 1235
  let id = `ST${year}-${String(number).padStart(7, "0")}`
  while (existingIds.includes(id)) {
    number += 1
    id = `ST${year}-${String(number).padStart(7, "0")}`
  }
  return id
}
