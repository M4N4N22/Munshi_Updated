# Phase 4 Live Validation — Notifications

**Run date:** 2026-06-07

---

## Method

Outbound messages are sent via `MessagingService.sendText` → OLLI WABA API (`OLLI_URL/external/waba/send`).  
Webhook handler returns `"ok"` regardless; **actual WhatsApp delivery requires OLLI credentials**.

---

## Live Observation

Backend logs during validation (`569733.txt`):

```
[MessagingService] WhatsApp send failed for 919900000001: [object Object]
```

**Count:** 14+ warnings during the live run window.

---

## Expected Notifications (by design)

| Event | Recipient | Expected message |
|-------|-----------|------------------|
| Confirmation prompt | Owner (919900000001) | Confirm task card |
| Task created | Owner | Task T-N created summary |
| Task assigned | Worker (Shyam 41) | New task notification |
| Inventory-linked task | Inventory stakeholders | Stock movement alert (if configured) |

---

## Live Result

| Check | Result |
|-------|--------|
| Handler invoked outbound send | **YES** — log warnings prove attempts |
| OLLI API accepted messages | **NO** — send failed |
| Owner received WhatsApp text | **NOT VERIFIED** |
| Worker received assignment notice | **NOT VERIFIED** |

---

## Environment Gap

`OLLI_URL` / `OLLI_KEY` in `.env.local` either missing, invalid, or staging WABA not authorized for test phones.

**Impact:** Live validation proves **server-side notification logic runs**, but **not end-user WhatsApp delivery**.

---

## Recommendation (documentation only)

For full notification UAT, configure valid OLLI credentials or enable a dev mock that logs outbound body to console/file.

---

*End of notifications report.*
