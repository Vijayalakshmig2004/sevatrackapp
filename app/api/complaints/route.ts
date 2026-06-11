import { NextRequest, NextResponse } from "next/server"
import {
  Complaint,
  appendTimeline,
  buildTimeline,
  generateComplaintId,
  getDepartment,
  getServicePartner,
  getSessionUser,
  readDb,
  writeDb,
} from "@/lib/server-data"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const db = await readDb()
    const complaints = db.complaints
      .filter((complaint) => complaint.userId === user.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({ complaints })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load complaints" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in again before submitting a complaint." }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body?.category || !body?.location || !body?.description) {
      return NextResponse.json({ error: "Category, location, and description are required." }, { status: 400 })
    }

    const db = await readDb()
    const now = new Date()
    const sla = new Date(now)
    sla.setDate(sla.getDate() + (body.urgency === "Emergency" ? 1 : body.urgency === "Urgent" ? 3 : 7))
    const escalation = new Date(now)
    escalation.setDate(escalation.getDate() + (body.urgency === "Emergency" ? 1 : 2))

    const title = body.title?.trim() || `${body.category} complaint`
    const department = getDepartment(body.category)
    const servicePartner = getServicePartner(db, department)
    const complaint: Complaint = {
      id: generateComplaintId(db.complaints.map((item) => item.id)),
      userId: user.id,
      title,
      category: body.category,
      location: body.location,
      description: body.description,
      department,
      urgency: body.urgency || "Normal",
      status: "in-progress",
      submittedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      slaDueAt: sla.toISOString(),
      escalationDueAt: escalation.toISOString(),
      servicePartner,
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
      timeline: buildTimeline("in-progress", department, now),
    }
    appendTimeline(complaint, "Service Partner Assigned", `${servicePartner.name} (${servicePartner.id}) has been assigned and will visit the complaint location.`)

    db.complaints.push(complaint)
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: user.id,
      title: "Complaint submitted",
      message: `${complaint.id} was created, assigned to ${department}, and service partner ${servicePartner.name} will visit the location.`,
      createdAt: now.toISOString(),
      read: false,
      complaintId: complaint.id,
    })
    await writeDb(db)

    return NextResponse.json({ complaint }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit complaint" }, { status: 500 })
  }
}
