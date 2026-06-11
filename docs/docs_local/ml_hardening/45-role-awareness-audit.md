# Phase 3.5 — Role-Awareness Audit

---

## Is role used during classification?

**No.** `POST /classify` accepts only `message` query parameter.

`routeMlFallback` does not pass role, factory, or phone to ML:

```typescript
axios.post(`${ml_url}/classify?message=${encodeURIComponent(body.message)}`)
```

---

## When is role applied?

| Stage | Role used? | Mechanism |
|-------|------------|-----------|
| ML classify | ❌ | — |
| general_chat routing | ✅ | `routeGeneralChat` — owner home vs worker hints |
| processCommand | ✅ | `ensureManager`, `ensureWorker` |
| Workflow start | ✅ | `ensureCanRunWorkflow` — blocks workers |
| taskInventoryNl | ✅ | Returns null for workers |
| Owner home triggers | ✅ | `isOwnerHomeTrigger` — pre-ML |

**Pattern:** Role enforcement is **post-classification**, mostly via HTTP exceptions or alternate UX.

---

## Impact by role

### Owner

| Aspect | Behavior |
|--------|----------|
| ML output | Same classifier as all roles |
| mgr* intents | May be emitted by ML — backend `ensureManager` passes but mgr handlers expect manager task context |
| general_chat | Redirected to owner home — **hides** misclassification |
| Invalid update | Blocked at processCommand |

### Manager

| Aspect | Behavior |
|--------|----------|
| Dual paths | Can receive `/assign` and `/mgr*` from same phrasing |
| ML cannot know | "Priya task 15 do" — mgrassign vs assign requires role+task ownership |
| update | Blocked — managers use complete |

### Worker

| Aspect | Behavior |
|--------|----------|
| Invalid intents | ML may emit `/assign`, `/inventory_status` — backend throws or friendly error |
| task-inventory | Skipped entirely in orchestrator |
| Workflows | Forbidden at `ensureCanRunWorkflow` |

---

## Eval implication

Phase 3 role-aware dataset (doc 32) tests **desired** behavior. Current architecture **cannot pass** role-invalid rejection at classify stage — only at backend.

**Metric split required:**
- **Classify-time role accuracy** — will fail today by design
- **End-to-end role safety** — backend may still block

---

## Partial role signal (indirect)

None intentionally sent. `general_chat` handling uses role **after** intent is already general_chat — not to fix wrong operational intent.
