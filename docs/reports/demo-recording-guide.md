# Demo Recording Guide — Genuine ML + Backend Flow

**Factory 3 · Owner 7452897444 · Manager 9456157007 · Worker Rahul Kumar**

Use this guide to start services, expose your local backend to Olli, and record the full WhatsApp demo.  
**All phrases run through real ML + backend handlers — `DEMO_MODE` must be `false`.**

Full validation report: `docs/reports/genuine-demo-readiness-report.md`

---

## Terminals to run (keep all open while recording)

Open **four separate terminals**. Do not run the tunnel in the same window where you stopped `yarn dev` (Ctrl+C leaves the shell in a bad state).

### Terminal 1 — ML intent classifier (port 8000)

Required for **manager routing/delegation** (those phrases are not handled by demo mode).

```powershell
cd C:\Users\shant\Downloads\Munshi-Dada-Phase-1-main\Munshi-Dada-Phase-1-main
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Verify:

```powershell
curl http://127.0.0.1:8000/health
```

---

### Terminal 2 — Backend (port 4001, `DEMO_MODE=false`)

```powershell
cd C:\Users\shant\Downloads\munshi-dada-AS-sructure\munshi-dada-AS-sructure
yarn dev
```

Wait for: `Application listening on port 4001`

Verify demo mode is **off** (required for genuine recording):

```powershell
curl http://127.0.0.1:4001/demo-mode/status
```

Expected: `{"enabled":false,"phrase_count":13}`

Confirm `.env.local` has:

- `DEMO_MODE=false`
- `ML_URL=http://127.0.0.1:8000` (not production ML)

Re-validate all flows before camera:

```powershell
node scripts/run-genuine-demo-validation.mjs
```

Expected verdict: **GO**

---

### Terminal 3 — Public tunnel (Olli → your laptop)

WhatsApp cannot reach `localhost`. Expose port 4001 and **leave this terminal open**.

**Option A — Cloudflare (recommended, more stable than localtunnel):**

```powershell
npx cloudflared tunnel --url http://127.0.0.1:4001
```

Copy the `https://….trycloudflare.com` URL.

**Option B — localtunnel (if cloudflared fails):**

```powershell
npx localtunnel --local-host 127.0.0.1 --port 4001
```

Copy the `https://….loca.lt` URL.

If the prompt returns immediately after `your url is: …`, the tunnel died — open a **fresh** terminal and retry, or use cloudflared.

Verify tunnel → backend:

```powershell
curl https://YOUR-TUNNEL-URL/demo-mode/status
```

---

### Terminal 4 — One-time prep (before recording, then can close)

```powershell
cd C:\Users\shant\Downloads\munshi-dada-AS-sructure\munshi-dada-AS-sructure
node scripts/demo-setup-users-data.mjs
```

Optional health sweep:

```powershell
curl http://127.0.0.1:4001/health
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:4001/health/migrations
```

---

### Olli dashboard (one-time per tunnel URL)

Set webhook URL to:

```
https://YOUR-TUNNEL-URL/webhook
```

The URL **changes every time** you restart the tunnel — update Olli before each recording session.

---

## Demo users (Factory 3)

| Role | Display phone | WhatsApp `from` | Name |
|------|---------------|-----------------|------|
| Owner | 7452897444 | 917452897444 | Shantanu Garg |
| Manager | 9456157007 | 919456157007 | Rahul Verma (Operations) |
| Worker | — | — | Rahul Kumar (assign/delegate target) |

---

## Recording script (use exact phrases)

Roman script only (not Devanagari). Case insensitive.

### Part A — Attendance & direct assign (~45s)

| Step | Who | Message | Expected |
|------|-----|---------|----------|
| 1 | **Manager** | `Aaj main present hoon` | Present marked for today |
| 2 | **Owner** | `Rahul Kumar ko store check ka kaam do` | Task assigned to Rahul Kumar; reply shows task # and description `store check ka kaam` |

All steps use **ML classify → backend handler** (no demo-mode intercept).

---

### Part B — Manager routing & delegation (~60–90s)

This shows **owner → manager → worker** delegation via genuine ML + backend routing.

| Step | Who | Message | Expected |
|------|-----|---------|----------|
| 3 | **Owner** | `Rahul Verma ko dispatch planning ka task do` | Reply includes **Task #…** routed to Rahul Verma. Manager gets routing prompt on WhatsApp. |
| 4 | **Manager** *(optional)* | `mere tasks dikhao` | Compact *Your pending tasks* list (~600 chars). Shows task # from step 3. |
| 5 | **Manager** | `task [NUMBER] Rahul Kumar ko do` | Task delegated to Rahul Kumar |
| 6 | **Worker** *(optional)* | `task [NUMBER] complete ho gaya` | Task marked complete — only if time permits. |

**Delegation rules (do not break on camera):**

- Use full name **`Rahul Kumar`** (not `Rahul` — ambiguous with manager Rahul Verma).
- Use **`Rahul Verma`** for manager routing (not `Rahul` alone).
- Delegate **once** per task — do not send step 5 twice on the same task ID.
- If stuck in a workflow, send: `cancel`

**What happens under the hood:**

```
Owner assign to manager → routing_status = AWAITING_MANAGER_ACTION
Manager: task 91 Rahul Kumar ko do → routing_status = DELEGATED_TO_WORKER
Worker notified on WhatsApp
```

---

### Part C — Inventory, procurement, report (~3 min)

Requires ML on `:8000`. Cancel any active workflow on owner phone first (`cancel`).

| Step | Who | Message | Expected |
|------|-----|---------|----------|
| 7 | **Owner** | `Steel sheets ka stock kitna bacha hai` | Steel Sheets · **120 sheets** · Main Warehouse |
| 8 | **Owner** | `purchase request bana do` | PR workflow starts |
| 9 | **Owner** | `Steel sheets ka order` | Title step |
| 10 | **Owner** | `Steel Sheets` | Item step |
| 11 | **Owner** | `25` | Quantity |
| 12 | **Owner** | `NO` | No more line items |
| 13 | **Owner** | `YES` | Approve |
| 14 | **Owner** | `Gupta Metals` | Vendor |
| 15 | **Owner** | `YES` | Close PR |
| 16 | **Owner** | `Mujhe aaj ka report dikhao` | Daily summary |

---

### Part D — Optional closing (~20s)

| Step | Who | Message | Expected |
|------|-----|---------|----------|
| 17 | **Owner** | `Mera business setup karna hai` | Business discovery starts (demo stub) |
| 18 | **Owner** | `Munshi inventory list upload karni hai` | Document-upload demo reply |

---

## Troubleshooting during recording

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No WhatsApp reply at all | Tunnel dead or Olli webhook wrong | Restart tunnel; update Olli `/webhook` URL |
| Step 7 → *Unknown command* | Webhook hits production, not local | Fix tunnel + Olli URL |
| Step 4 shows IT evidence tasks | Old backend or wrong user | Restart backend; manager list is now filtered |
| Step 4 no reply | Olli outbound failed (rare now — list is ~600 chars) | Use task ID from step 3 owner reply |
| `EADDRINUSE` on 4001 | Two backends running | Close extra `yarn dev`; one process only |

**While recording, watch Terminal 2 logs for:**

```
POST /webhook
ml-classify { intent: '/assign', worker_slug: 'verma' }   ← genuine ML path
GetOlli-Webhook/1.0                                        ← real WhatsApp inbound
```

**Do not** expect `demo-mode intercept` lines — demo mode is off.

---

## After recording

1. Keep `DEMO_MODE=false` for production-like behaviour
2. Restore Olli webhook to production URL when redeploying

---

## Quick checklist before camera

- [ ] Terminal 1: ML on `:8000` healthy
- [ ] Terminal 2: Backend on `:4001`, `demo-mode/status` → **disabled**
- [ ] `node scripts/run-genuine-demo-validation.mjs` → **GO**
- [ ] Terminal 3: Tunnel running, URL copied to Olli `…/webhook`
- [ ] `demo-setup-users-data.mjs` run
- [ ] Both phones logged into WhatsApp (owner + manager)
- [ ] No stale workflows (`cancel` on both phones if unsure)

**Estimated total time:** ~7–8 minutes (Parts A–C core; Part D optional)
