# Demo Safety Audit v2 — Based on Live Certification

**Source:** `demo-certification-results.json` (2026-06-02T15:19:24.263Z)  
**Previous v1 audit superseded.**

## SAFE ✅ — Use in recording

| Flow | Certified phrase | Evidence |
|------|------------------|----------|
| Attendance | `Aaj main present hoon` | DB is_present=true |
| Task assign (owner) | `Rahul Kumar ko store check ka kaam do` | tasks count +1 |
| Owner → manager route | `Rahul Verma ko dispatch planning ka task do` | AWAITING_MANAGER_ACTION |
| Manager delegate | `task [ID] Rahul Kumar ko do` | DELEGATED_TO_WORKER |
| Inventory | `Steel sheets ka stock kitna bacha hai` | /inventory_status ok |
| Purchase request | `purchase request bana do` + workflow replies | PR CLOSED in dry run |
| Vendor assign | `Gupta Metals` then `YES` | assigned_vendor_id=12 |
| Report | `Mujhe aaj ka report dikhao` | /report ok (after PR closed) |
| Discovery (optional) | `mera business setup karna hai` | session MENU — cancel after |

## RISKY ⚠️ — Avoid or have backup

| Flow | Why | Mitigation |
|------|-----|------------|
| Manager task list | Olli send `error` on long list during audit | Owner states task # verbally after routing |
| Task update/complete without ID | May not resolve task | Use `task [ID] ...` from Munshi assign message |
| `Rahul ko ...` (partial name) | Ambiguous Rahul Verma vs Rahul Kumar | Always **Rahul Kumar** for worker |
| Any phrase with "inventory" in task context | ML → /inventory_status | Use "store check" instead |
| Section 9 WhatsApp document NL | No inbound document handler | Pre-upload via API; skip NL claim in video |
| Vendor narration (Section 5) | general_chat — no structured response | Skip or ad-lib human narration |

## UNSAFE ❌ — Do not demo

| Flow | Why |
|------|-----|
| `Rahul ko inventory check karne ka task de do` | Wrong intent — no task created |
| `main khud yeh kaam karunga` | general_chat — no /mgrself |
| Manager dept transfer NL | Known unreliable |
| Slash commands | Violates demo requirements |
| Re-delegate same task | BadRequest 400 |
| Commands during active PR/Discovery | Session interference |

## Reclassification vs Prompt 13.5

| Item | v1 | v2 (live) |
|------|----|----|
| Manager task list | SAFE | **RISKY** (Olli) |
| Worker task complete | SAFE (kaam complete ho gaya) | **RISKY** without task ID; **SAFE** with `task [ID] complete ho gaya` |
| demo-script-v1 overall | GO | **Conditional** — use certified script |
