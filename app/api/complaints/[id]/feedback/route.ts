import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, readDb, writeDb } from "@/lib/server-data"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const rating = Number(body.rating)
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
  }

  const db = await readDb()
  const complaint = db.complaints.find((item) => item.id.toLowerCase() === id.toLowerCase() && item.userId === user.id)
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 })

  complaint.feedback = {
    rating,
    comment: body.comment || "",
    submittedAt: new Date().toISOString(),
  }
  complaint.status = "closed"
  complaint.updatedAt = new Date().toISOString()
  await writeDb(db)

  return NextResponse.json({ complaint })
}
