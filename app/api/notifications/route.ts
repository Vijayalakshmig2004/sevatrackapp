import { NextResponse } from "next/server"
import { getSessionUser, readDb, writeDb } from "@/lib/server-data"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = await readDb()
  const notifications = db.notifications
    .filter((notification) => notification.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ notifications })
}

export async function PATCH() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = await readDb()
  db.notifications = db.notifications.map((notification) =>
    notification.userId === user.id ? { ...notification, read: true } : notification,
  )
  await writeDb(db)

  return NextResponse.json({ ok: true })
}
