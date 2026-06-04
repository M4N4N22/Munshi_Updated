import { createClient } from "@libsql/client"

let db: ReturnType<typeof createClient> | null = null
let initPromise: Promise<void> | null = null

function getDb() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL is required to access leads.")
  }

  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }

  return db
}

const initDb = async () => {
  const db = getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS leads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      phone_number  TEXT NOT NULL,
      business_name TEXT NOT NULL,
      description   TEXT NOT NULL,
      archived      INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'new',
      notes         TEXT NOT NULL DEFAULT '',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Safe migrations for existing deployments
  const migrations = [
    `ALTER TABLE leads ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`,
    `ALTER TABLE leads ADD COLUMN notes TEXT NOT NULL DEFAULT ''`,
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* column exists, skip */ }
  }
}

async function ensureDb() {
  if (!initPromise) {
    initPromise = initDb()
  }
  await initPromise
}

export type LeadStatus = "new" | "contacted" | "interested" | "converted" | "not_interested"

interface LeadInput {
  name: string
  phone_number: string
  business_name: string
  description: string
}

export interface Lead extends LeadInput {
  id: number
  archived: number
  status: LeadStatus
  notes: string
  created_at: string
}

export async function insertLead(lead: LeadInput): Promise<Lead> {
  const db = getDb()
  await ensureDb()
  const result = await db.execute({
    sql: `INSERT INTO leads (name, phone_number, business_name, description)
          VALUES (?, ?, ?, ?)`,
    args: [lead.name, lead.phone_number, lead.business_name, lead.description],
  })
  return { id: Number(result.lastInsertRowid), ...lead, archived: 0, status: "new", notes: "", created_at: new Date().toISOString() }
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = getDb()
  await ensureDb()
  const result = await db.execute(`SELECT * FROM leads WHERE archived = 0 ORDER BY created_at DESC`)
  return result.rows as unknown as Lead[]
}

export async function getArchivedLeads(): Promise<Lead[]> {
  const db = getDb()
  await ensureDb()
  const result = await db.execute(`SELECT * FROM leads WHERE archived = 1 ORDER BY created_at DESC`)
  return result.rows as unknown as Lead[]
}

export async function archiveLead(id: number): Promise<void> {
  const db = getDb()
  await ensureDb()
  await db.execute({ sql: `UPDATE leads SET archived = 1 WHERE id = ?`, args: [id] })
}

export async function unarchiveLead(id: number): Promise<void> {
  const db = getDb()
  await ensureDb()
  await db.execute({ sql: `UPDATE leads SET archived = 0 WHERE id = ?`, args: [id] })
}

export async function deleteLead(id: number): Promise<void> {
  const db = getDb()
  await ensureDb()
  await db.execute({ sql: `DELETE FROM leads WHERE id = ?`, args: [id] })
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<void> {
  const db = getDb()
  await ensureDb()
  await db.execute({ sql: `UPDATE leads SET status = ? WHERE id = ?`, args: [status, id] })
}

export async function updateLeadNotes(id: number, notes: string): Promise<void> {
  const db = getDb()
  await ensureDb()
  await db.execute({ sql: `UPDATE leads SET notes = ? WHERE id = ?`, args: [notes, id] })
}