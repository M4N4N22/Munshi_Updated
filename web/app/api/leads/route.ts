export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import {
  insertLead, getAllLeads, getArchivedLeads,
  archiveLead, unarchiveLead, deleteLead,
  updateLeadStatus, updateLeadNotes,
  LeadStatus,
} from "@/lib/db"

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY
}

// POST — submit a new lead (public)
export async function POST(req: NextRequest) {
  try {
    const { name, number, businessName, description } = await req.json()
    if (!name || !number || !businessName || !description)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    const lead = await insertLead({ name, phone_number: number, business_name: businessName, description })
    return NextResponse.json({ success: true, id: lead.id }, { status: 200 })
  } catch (err) {
    console.error("POST /api/leads error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

// GET — fetch active or archived leads (admin)
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const view = req.nextUrl.searchParams.get("view")
    const leads = view === "archived" ? await getArchivedLeads() : await getAllLeads()
    return NextResponse.json({ leads }, { status: 200 })
  } catch (err) {
    console.error("GET /api/leads error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

// PATCH — archive/unarchive, update status, update notes (admin)
export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const { action } = body
    const id = Number(body.id)

    if (!id || isNaN(id)) return NextResponse.json({ error: "Valid ID required." }, { status: 400 })

    if (action === "archive") {
      await archiveLead(id)
    } else if (action === "unarchive") {
      await unarchiveLead(id)
    } else if (action === "status") {
      const { status } = body
      if (!status) return NextResponse.json({ error: "Status value required." }, { status: 400 })
      await updateLeadStatus(id, status as LeadStatus)
    } else if (action === "notes") {
      const { notes } = body
      if (notes === undefined) return NextResponse.json({ error: "Notes value required." }, { status: 400 })
      await updateLeadNotes(id, notes)
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("PATCH /api/leads error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

// DELETE — permanently delete a lead (admin)
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const id = Number(body.id)
    if (!id || isNaN(id)) return NextResponse.json({ error: "Valid ID required." }, { status: 400 })
    await deleteLead(id)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("DELETE /api/leads error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}