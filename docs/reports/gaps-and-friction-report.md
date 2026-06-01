# Gaps and Friction Report

**QA perspective:** Issues a real customer would hit. **No code changes made.**

---

## P0 — Showstoppers

### 1. Production ML deployment drift

**Symptom:** Owner says "purchase request bana do" → Munshi assigns a department task.  
**Root cause (observed):** `ML_URL` points to `13.126.57.78:8000` which returns intents inconsistent with local LLM repo and `backend-llm-contract.md`.  
**Customer frustration:** High — silent wrong actions.  
**Fix owner:** Redeploy ML (outside QA scope).

### 2. Business Discovery unreachable via natural language

**Symptom:** "mera business Sharma Packaging hai" → general chat.  
**Impact:** Core Prompt 11 value proposition invisible to customers.  
**Backend:** Discovery APIs work (`92%` readiness on test factory from prior data).

### 3. Inventory & procurement NL completely broken on prod ML

**Symptom:** All stock and ordering phrases fail or misroute.  
**Impact:** Packaging manufacturer cannot manage materials via Munshi chat.

---

## P1 — Major friction

### 4. "Vendor list" shows team members

**Symptom:** "vendor list dikhao" → `/members`.  
**Expected:** Supplier list or vendor search.  
**Feels:** Broken or ignorant of business context.

### 5. No vendor WhatsApp role

**Symptom:** Simulation assumes vendor users; platform has vendor **master data only**.  
**Impact:** Procurement story incomplete for supplier collaboration.

### 6. Purchase request status not queryable in NL

**Symptom:** "purchase request ka status" → general chat.  
**Impact:** Owner cannot track orders conversationally.

### 7. Low-stock natural language not mapped

**Symptom:** "packaging tape khatam hone wali hai" → general chat.  
**Impact:** Missed proactive procurement trigger.

---

## P2 — Moderate friction

### 8. Empty inventory on test factory

**Symptom:** 0 items despite discovery inventory bucket at 67%.  
**Impact:** Even correct inventory_status would return empty — confusing in demos.

### 9. Document workflows untested

**Symptom:** 0 documents; no WhatsApp file upload in QA.  
**Impact:** Unknown reliability of parse → suggest → approve → discovery boost chain.

### 10. Reminder behavior unobserved

**Symptom:** `next_reminder_at` set but 24h/7d cycle not witnessed.  
**Impact:** Unknown if WhatsApp reminders actually send (cron may only update DB).

### 11. Misspellings fail

**Symptom:** "invntry sttus" → general chat.  
**Impact:** Real users typo; no fuzzy recovery.

### 12. Pause discovery via natural language unclear

**Symptom:** "baad mein karenge" → general chat, not pause.  
**Impact:** Owner may think they paused; reminders still schedule.

---

## P3 — UX polish

### 13. Robotic general chat

**Symptom:** Failed intents fall to chat without suggesting what Munshi can do.  
**Feels:** Unhelpful assistant.

### 14. Sharma scenario not seedable via NL

**Symptom:** Cannot stand up full company purely through chat given current intent failures.  
**Impact:** Demo/storytelling requires API or slash commands (forbidden in customer sim).

### 15. Manager inventory queries route to tasks

**Symptom:** "stock level dikhao" → `/tasks`.  
**Impact:** Wrong role experience for inventory manager.

---

## Positive friction reductions (working well)

- Hindi attendance phrases feel native
- "task complete ho gaya" works without English
- Manager rejection with reason in one message
- Reports accessible via natural Hindi ("aaj attendance report dikhao")
- Non-blocking discovery design (when reachable) — no forced onboarding wall

---

## Test environment gaps (not product bugs)

- Sharma Packaging entities not in DB
- QA used factory_id=3 smoke data
- No live WhatsApp E2E in this session

---

## Summary

| Priority | Count | Theme |
|----------|-------|-------|
| P0 | 3 | ML deployment / owner NL broken |
| P1 | 4 | Semantic mismatches, missing vendor UX |
| P2 | 4 | Data, documents, reminders, typos |
| P3 | 3 | Polish and demo readiness |

**Primary gap:** Intent classification on production ML — not backend workflow logic.

---

## LOCAL VALIDATION RESULTS

### New findings (local stack)

| ID | Finding | Deployment or product? |
|----|---------|------------------------|
| L1 | Backend `ML_URL` points to prod while local ML runs on :8000 | **Config / stack** — not code |
| L2 | Local ML fixes owner discovery/inventory/vendor/PR intents | **Deployment** — prod stale |
| L3 | Local pre-classifier misses `aaj main present hoon`, `machine 2 band padi hai` | **Product** — Hindi worker regex gap |
| L4 | Local pre-classifier misses `rahul ko … kaam assign karo` | **Product** — Hindi manager assign gap |
| L5 | Mid-workflow replies (`1`, business name, `pause`) → `general_chat` | **Product** — active session should bypass re-classify |
| L6 | Webhook returns `ok`/`error` only — QA cannot see Munshi reply text | **Product** — test observability |
| L7 | Continuous story: 0 new vendors/items/PRs; attendance +1, issue +1 | **Product/E2E** — incomplete business story |
| L8 | Document/suggestion phases blocked (NL-only, no file upload) | **Test constraint** |
| L9 | Sharma personas mapped to factory 3 test users (not seeded names) | **Test data** |

### Revised priority after local validation

**P0 remains prod ML redeploy.** Additional **P1 product** items: Hindi worker/manager pre-classifiers, workflow mid-session routing, `ML_URL` alignment for local dev E2E.
