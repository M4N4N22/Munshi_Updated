"use client"

import { useState, useMemo, useRef } from "react"
import {
  Download, RefreshCw, Shield, Archive, ArchiveRestore,
  Trash2, Inbox, AlertTriangle, Search, X,
  ChevronUp, ChevronDown, StickyNote, Check,
} from "lucide-react"
import { LoadingState } from "@/components/ui/loading-state"
import { Spinner } from "@/components/ui/spinner"

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "interested" | "converted" | "not_interested"
type View = "active" | "archived"
type SortField = "created_at" | "name" | "business_name"
type SortDir = "asc" | "desc"

interface Lead {
  id: number
  name: string
  phone_number: string
  business_name: string
  description: string
  status: LeadStatus
  notes: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; dot: string }> = {
  new:           { label: "New",           color: "bg-blue-500/15 text-blue-400 border-blue-500/20",     dot: "bg-blue-400" },
  contacted:     { label: "Contacted",     color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
  interested:    { label: "Interested",    color: "bg-purple-500/15 text-purple-400 border-purple-500/20", dot: "bg-purple-400" },
  converted:     { label: "Converted",     color: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/20",   dot: "bg-[#25D366]" },
  not_interested:{ label: "Not Interested",color: "bg-red-500/15 text-red-400 border-red-500/20",         dot: "bg-red-400" },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as LeadStatus[]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG["new"]
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function StatusDropdown({ lead, adminKey, onChange }: {
  lead: Lead
  adminKey: string
  onChange: (id: number, status: LeadStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const openDropdown = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const dropdownHeight = 200 // approximate height of 5 items
      const spaceBelow = window.innerHeight - r.bottom
      const top = spaceBelow < dropdownHeight
        ? r.top - dropdownHeight - 6
        : r.bottom + 6
      setPos({ top, left: r.left })
    }
    setOpen(true)
  }

  const select = async (status: LeadStatus) => {
    setOpen(false)
    setSaving(true)
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: lead.id, action: "status", status }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onChange(lead.id, status)
      } else {
        console.error("Status update failed:", data.error)
      }
    } catch (err) {
      console.error("Status update error:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={openDropdown}
        disabled={saving}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        <StatusBadge status={lead.status ?? "new"} />
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-[#1a2a1f] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[170px]"
            style={{ top: pos.top, left: pos.left }}
          >
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => select(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[s].dot}`} />
                <span className="text-xs font-medium text-gray-300">{STATUS_CONFIG[s].label}</span>
                {(lead.status ?? "new") === s && <Check className="w-3 h-3 text-[#25D366] ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NotesCell({ lead, adminKey, onChange }: {
  lead: Lead
  adminKey: string
  onChange: (id: number, notes: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(lead.notes)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: lead.id, action: "notes", notes: draft }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onChange(lead.id, draft)
        setOpen(false)
      } else {
        console.error("Notes update failed:", data.error)
      }
    } catch (err) {
      console.error("Notes update error:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setDraft(lead.notes); setOpen(true) }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          lead.notes
            ? "bg-white/10 text-white hover:bg-white/15"
            : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
        }`}
      >
        <StickyNote className="w-3.5 h-3.5" />
        {lead.notes ? "Edit note" : "Add note"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a2a1f] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">{lead.name}</h3>
                <p className="text-xs text-gray-500">{lead.business_name}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note about this lead..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-[#25D366]/50 resize-none transition-colors"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1fba5a] text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminKey, setAdminKey]         = useState("")
  const [leads, setLeads]               = useState<Lead[]>([])
  const [loading, setLoading]           = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError]               = useState("")
  const [authed, setAuthed]             = useState(false)
  const [view, setView]                 = useState<View>("active")
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [sortField, setSortField]       = useState<SortField>("created_at")
  const [sortDir, setSortDir]           = useState<SortDir>("desc")

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLeads = async (targetView: View = view, key: string = adminKey) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/leads${targetView === "archived" ? "?view=archived" : ""}`, {
        headers: { "x-admin-key": key },
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch")
      setLeads((await res.json()).leads)
      setAuthed(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }

  const switchView = (next: View) => { setView(next); setSearch(""); setStatusFilter("all"); fetchLeads(next) }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const patchLead = async (id: number, body: object) => {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ id, ...body }),
    })
  }

  const handleArchive   = async (id: number) => { setActionLoading(id); await patchLead(id, { action: "archive" });   setLeads(p => p.filter(l => l.id !== id)); setActionLoading(null) }
  const handleUnarchive = async (id: number) => { setActionLoading(id); await patchLead(id, { action: "unarchive" }); setLeads(p => p.filter(l => l.id !== id)); setActionLoading(null) }

  const handleDelete = async (id: number) => {
    setConfirmId(null)
    setActionLoading(id)
    await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ id }),
    })
    setLeads(p => p.filter(l => l.id !== id))
    setActionLoading(null)
  }

  const handleStatusChange = (id: number, status: LeadStatus) =>
    setLeads(p => p.map(l => l.id === id ? { ...l, status } : l))

  const handleNotesChange = (id: number, notes: string) =>
    setLeads(p => p.map(l => l.id === id ? { ...l, notes } : l))

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return {
      total:     leads.length,
      thisWeek:  leads.filter(l => new Date(l.created_at) >= weekAgo).length,
      converted: leads.filter(l => l.status === "converted").length,
      new:       leads.filter(l => l.status === "new").length,
    }
  }, [leads])

  // ── Filtered + sorted leads ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let out = [...leads]
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone_number.includes(q) ||
        l.business_name.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") out = out.filter(l => l.status === statusFilter)
    out.sort((a, b) => {
      const va = a[sortField] ?? ""
      const vb = b[sortField] ?? ""
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return out
  }, [leads, search, statusFilter, sortField, sortDir])

  // ── Sort toggle ────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("desc") }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />

  // ── CSV ────────────────────────────────────────────────────────────────────

  const downloadCSV = () => {
    const headers = ["ID", "Name", "Phone", "Business", "Description", "Status", "Notes", "Submitted"]
    const rows = filtered.map(l => [
      l.id, l.name, l.phone_number, l.business_name,
      `"${l.description.replace(/"/g, '""')}"`,
      STATUS_CONFIG[l.status].label,
      `"${l.notes.replace(/"/g, '""')}"`,
      new Date(l.created_at).toLocaleString("en-IN"),
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `munshidada-${view}-leads-${new Date().toISOString().split("T")[0]}.csv`,
    })
    a.click()
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Leads</h2>
          <p className="text-gray-500 text-sm">Website demo / contact form submissions</p>
        </div>

        {/* ── Login ── */}
        {!authed ? (
          <div className="flex items-start justify-center pt-4 sm:pt-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-sm">
              <div className="w-12 h-12 bg-[#25D366]/15 rounded-xl flex items-center justify-center mb-5">
                <Shield className="w-5 h-5 text-[#25D366]" />
              </div>
              <h2 className="text-xl font-bold mb-1">Admin Access</h2>
              <p className="text-gray-500 text-sm mb-5">Enter your admin key to view submissions.</p>
              <input
                type="password"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchLeads("active", adminKey)}
                placeholder="Enter admin key"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#25D366] transition-colors mb-4 text-sm"
              />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <button
                onClick={() => fetchLeads("active", adminKey)}
                disabled={loading}
                className="w-full bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" variant="onDark" />
                    Opening…
                  </span>
                ) : (
                  "Access Dashboard"
                )}
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* ── Stats row ── */}
            {view === "active" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Leads",  value: stats.total,     color: "text-white" },
                  { label: "This Week",    value: stats.thisWeek,  color: "text-blue-400" },
                  { label: "New",          value: stats.new,       color: "text-yellow-400" },
                  { label: "Converted",    value: stats.converted, color: "text-[#25D366]" },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tabs + actions ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                <button
                  onClick={() => switchView("active")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === "active" ? "bg-[#25D366] text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  <Inbox className="w-4 h-4" />
                  Active
                  {view === "active" && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/20">{leads.length}</span>}
                </button>
                <button
                  onClick={() => switchView("archived")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === "archived" ? "bg-amber-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  <Archive className="w-4 h-4" />
                  Archived
                  {view === "archived" && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/20">{leads.length}</span>}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => fetchLeads()} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-medium transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1fba5a] rounded-xl text-sm font-bold transition-colors">
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* ── Search + filter bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, phone or business..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-[#25D366]/50 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {view === "active" && (
                <div className="flex gap-1.5 flex-wrap">
                  {(["all", ...ALL_STATUSES] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                        statusFilter === s
                          ? s === "all"
                            ? "bg-white/20 border-white/30 text-white"
                            : `${STATUS_CONFIG[s as LeadStatus].color} border-opacity-100`
                          : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {s === "all" ? "All" : STATUS_CONFIG[s as LeadStatus].label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Archived banner */}
            {view === "archived" && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-amber-300">
                <Archive className="w-4 h-4 flex-shrink-0" />
                Archived leads are hidden from the active list. Restore them or permanently delete them here.
              </div>
            )}

            {/* Results count */}
            {!loading && leads.length > 0 && (
              <p className="text-xs text-gray-600 mb-3">
                Showing {filtered.length} of {leads.length} leads
                {search && ` matching "${search}"`}
                {statusFilter !== "all" && ` · ${STATUS_CONFIG[statusFilter].label}`}
              </p>
            )}

            {loading ? (
              <LoadingState className="py-20" variant="onDark" size="lg" minHeight="min-h-[12rem]" />
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                {leads.length === 0
                  ? view === "active" ? "No active leads yet." : "No archived leads."
                  : "No leads match your search or filters."}
              </div>
            ) : (
              <>
                {/* ── Desktop table ── */}
                <div className="hidden md:block bg-white/5 border border-white/10 rounded-2xl">
                  <div className="overflow-x-visible">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold w-8">#</th>
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                            <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
                          </th>
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold">Phone</th>
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold cursor-pointer select-none" onClick={() => toggleSort("business_name")}>
                            <span className="flex items-center gap-1">Business <SortIcon field="business_name" /></span>
                          </th>
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold">Description</th>
                          {view === "active" && <th className="text-left px-5 py-4 text-gray-400 font-semibold">Status</th>}
                          {view === "active" && <th className="text-left px-5 py-4 text-gray-400 font-semibold">Notes</th>}
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                            <span className="flex items-center gap-1">Submitted <SortIcon field="created_at" /></span>
                          </th>
                          <th className="text-left px-5 py-4 text-gray-400 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((lead, i) => (
                          <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4 text-gray-500">{i + 1}</td>
                            <td className="px-5 py-4 font-medium text-white">{lead.name}</td>
                            <td className="px-5 py-4">
                              <a href={`tel:${lead.phone_number}`} className="text-[#25D366] hover:underline font-mono">{lead.phone_number}</a>
                            </td>
                            <td className="px-5 py-4 text-gray-300">{lead.business_name}</td>
                            <td className="px-5 py-4 text-gray-400 max-w-[180px]"><p className="line-clamp-2">{lead.description}</p></td>
                            {view === "active" && (
                              <td className="px-5 py-4">
                                <StatusDropdown lead={lead} adminKey={adminKey} onChange={handleStatusChange} />
                              </td>
                            )}
                            {view === "active" && (
                              <td className="px-5 py-4">
                                <NotesCell lead={lead} adminKey={adminKey} onChange={handleNotesChange} />
                              </td>
                            )}
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">{fmt(lead.created_at)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                {view === "active" ? (
                                  <button onClick={() => handleArchive(lead.id)} disabled={actionLoading === lead.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-colors disabled:opacity-40">
                                    <Archive className="w-3.5 h-3.5" />
                                    {actionLoading === lead.id ? "..." : "Archive"}
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => handleUnarchive(lead.id)} disabled={actionLoading === lead.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-semibold transition-colors disabled:opacity-40">
                                      <ArchiveRestore className="w-3.5 h-3.5" />
                                      {actionLoading === lead.id ? "..." : "Restore"}
                                    </button>
                                    <button onClick={() => setConfirmId(lead.id)} disabled={actionLoading === lead.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors disabled:opacity-40">
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {actionLoading === lead.id ? "..." : "Delete"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Mobile cards ── */}
                <div className="md:hidden space-y-3">
                  {filtered.map((lead, i) => (
                    <div key={lead.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                            <span className="font-semibold text-white text-sm">{lead.name}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{lead.business_name}</p>
                        </div>
                        <a href={`tel:${lead.phone_number}`} className="text-[#25D366] font-mono text-sm font-semibold shrink-0 hover:underline">{lead.phone_number}</a>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-3">{lead.description}</p>
                      {view === "active" && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <StatusDropdown lead={lead} adminKey={adminKey} onChange={handleStatusChange} />
                          <NotesCell lead={lead} adminKey={adminKey} onChange={handleNotesChange} />
                        </div>
                      )}
                      {lead.notes && (
                        <p className="text-xs text-gray-500 italic bg-white/5 rounded-lg px-3 py-2 mb-3 line-clamp-2">"{lead.notes}"</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-gray-600">{fmt(lead.created_at)}</p>
                        <div className="flex gap-2">
                          {view === "active" ? (
                            <button onClick={() => handleArchive(lead.id)} disabled={actionLoading === lead.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold disabled:opacity-40">
                              <Archive className="w-3 h-3" />
                              {actionLoading === lead.id ? "..." : "Archive"}
                            </button>
                          ) : (
                            <>
                              <button onClick={() => handleUnarchive(lead.id)} disabled={actionLoading === lead.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] text-xs font-semibold disabled:opacity-40">
                                <ArchiveRestore className="w-3 h-3" />
                                {actionLoading === lead.id ? "..." : "Restore"}
                              </button>
                              <button onClick={() => setConfirmId(lead.id)} disabled={actionLoading === lead.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold disabled:opacity-40">
                                <Trash2 className="w-3 h-3" />
                                {actionLoading === lead.id ? "..." : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      {/* ── Delete confirmation modal ── */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a2a1f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Delete this lead?</h3>
            <p className="text-sm text-gray-400 mb-6">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}