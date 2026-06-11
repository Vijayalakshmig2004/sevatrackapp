import { NextResponse } from "next/server"
import { appendTimeline, getServicePartner, getSessionUser, readDb, writeDb } from "@/lib/server-data"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const db = await readDb()
  const complaint = db.complaints.find((item) => item.id.toLowerCase() === id.toLowerCase() && item.userId === user.id)
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 })

  const partner = getServicePartner(db, complaint.department)
  complaint.servicePartner = partner
  complaint.status = "in-progress"
  complaint.updatedAt = new Date().toISOString()
  appendTimeline(complaint, "Service Partner Assigned", `${partner.name} (${partner.id}) has been assigned and will visit the complaint location.`)

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: user.id,
    title: "Service partner assigned",
    message: `${partner.name} was assigned to ${complaint.id}. Expected visit: ${partner.eta}.`,
    createdAt: new Date().toISOString(),
    read: false,
    complaintId: complaint.id,
  })

  await writeDb(db)
  return NextResponse.json({ complaint })
}
