import { NextResponse } from "next/server"
import { appendTimeline, getSessionUser, readDb, writeDb } from "@/lib/server-data"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const db = await readDb()
  const complaint = db.complaints.find((item) => item.id.toLowerCase() === id.toLowerCase() && item.userId === user.id)
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 })
  if (!complaint.servicePartner) return NextResponse.json({ error: "Assign a service partner first." }, { status: 400 })

  complaint.status = "resolved"
  complaint.serviceCompletedAt = new Date().toISOString()
  complaint.updatedAt = new Date().toISOString()
  appendTimeline(complaint, "Problem Completed by Service Partner", `${complaint.servicePartner.name} marked the problem as completed at the given location.`)

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: user.id,
    title: "Problem completed",
    message: `${complaint.servicePartner.name} marked ${complaint.id} as completed. Please review and close it.`,
    createdAt: new Date().toISOString(),
    read: false,
    complaintId: complaint.id,
  })

  await writeDb(db)
  return NextResponse.json({ complaint })
}
