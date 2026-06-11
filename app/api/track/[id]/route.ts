import { NextResponse } from "next/server"
import { readDb } from "@/lib/server-data"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await readDb()
  const complaint = db.complaints.find((item) => item.id.toLowerCase() === id.toLowerCase())
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 })

  return NextResponse.json({ complaint })
}
