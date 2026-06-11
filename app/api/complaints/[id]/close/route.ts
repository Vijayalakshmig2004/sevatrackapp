import { NextResponse } from "next/server"
import { appendTimeline, getSessionUser, readDb, writeDb } from "@/lib/server-data"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const db = await readDb()
  const complaint = db.complaints.find((item) => item.id.toLowerCase() === id.toLowerCase() && item.userId === user.id)
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 })
  if (complaint.status !== "resolved") return NextResponse.json({ error: "Only resolved complaints can be closed." }, { status: 400 })

  complaint.status = "closed"
  complaint.closedAt = new Date().toISOString()
  complaint.updatedAt = new Date().toISOString()
  appendTimeline(complaint, "Complaint Closed", "The citizen confirmed completion and the complaint was closed.")

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: user.id,
    title: "Complaint closed",
    message: `${complaint.id} has been closed successfully.`,
    createdAt: new Date().toISOString(),
    read: false,
    complaintId: complaint.id,
  })

  await writeDb(db)
  return NextResponse.json({ complaint })
}
