import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, readDb } from "@/lib/server-data"

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function endOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const fromParam = request.nextUrl.searchParams.get("from")
  const toParam = request.nextUrl.searchParams.get("to")
  const from = fromParam ? new Date(fromParam) : null
  const to = toParam ? endOfDay(new Date(toParam)) : null

  const db = await readDb()
  const complaints = db.complaints
    .filter((complaint) => complaint.userId === user.id)
    .filter((complaint) => {
      const submittedAt = new Date(complaint.submittedAt)
      if (from && submittedAt < from) return false
      if (to && submittedAt > to) return false
      return true
    })
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())

  const headers = [
    "Complaint ID",
    "Title",
    "Category",
    "Department",
    "Status",
    "Urgency",
    "Location",
    "Submitted At",
    "Updated At",
    "SLA Due At",
    "Escalation Due At",
    "Service Partner Name",
    "Service Partner ID",
    "Service Partner Phone",
    "Vehicle Number",
    "Closed At",
  ]

  const rows = complaints.map((complaint) => [
    complaint.id,
    complaint.title,
    complaint.category,
    complaint.department,
    complaint.status,
    complaint.urgency,
    complaint.location,
    complaint.submittedAt,
    complaint.updatedAt,
    complaint.slaDueAt,
    complaint.escalationDueAt,
    complaint.servicePartner?.name,
    complaint.servicePartner?.id,
    complaint.servicePartner?.phone,
    complaint.servicePartner?.vehicleNo,
    complaint.closedAt,
  ])

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
  const filename = `sevatrack-complaints-${fromParam || "start"}-to-${toParam || "today"}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
