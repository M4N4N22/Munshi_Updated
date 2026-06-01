# Worker Experience Report — Rahul, Vikas, Anil, Deepak, Ramesh

**Rating: 8 / 10**

---

## Attendance

| Worker | Message | Expected | Prod ML | Result |
|--------|---------|----------|---------|--------|
| Rahul | "aaj main present hoon" | `/present` | `/present` | **PASS** |
| Rahul | "aaj nahi aa paunga" | `/absent` | `/absent` | **PASS** |

Natural Hindi attendance phrases work. Low friction for daily check-in.

---

## Task completion

| Worker | Message | Expected | Prod ML | Result |
|--------|---------|----------|---------|--------|
| Rahul | "task complete ho gaya" | `/complete` | `/complete` | **PASS** |

Matches spoken shop-floor language ("ho gaya").

---

## Issue reporting

| Worker | Message | Expected | Prod ML | Result |
|--------|---------|----------|---------|--------|
| Vikas | "machine 2 band padi hai" | `/issue` | `/issue` | **PASS** |
| Anil | "raw material nahi mil raha" | `/issue` | `/issue` | **PASS** |

Equipment and material shortage reports classify correctly — critical for packaging manufacturing.

---

## Untested worker paths

- Task list ("mera kaam dikhao")
- Task update with message
- Issue escalation follow-up
- Workers attempting owner/manager actions (should be blocked — not tested E2E)

---

## Friction points

1. "task complete ho gaya" without task ID may ambiguity-resolve incorrectly in edge cases (not hit in this test).
2. No tested path for workers to report low stock (would likely misroute — owner/procurement problem).
3. Workers cannot participate in discovery — expected.

---

## Rating rationale

**8/10** — Best NL experience in the platform today. Attendance, completion, and issue reporting feel natural in Hindi/Hinglish on production ML.

---

## LOCAL VALIDATION RESULTS

**Story tested:** Rahul marks present, reports machine down, completes task.

| Message | Local pre-classifier | Local ML HTTP | Prod ML (webhook) | Webhook | DB signal |
|---------|---------------------|---------------|-------------------|---------|-----------|
| aaj main present hoon | `None` → general | `general_chat` | `/present` | `ok` | Reports: present **1** (was 0) |
| machine 2 band padi hai | `None` → general | `general_chat` | `/issue` | `ok` | Reports: open issues **1** |
| task complete ho gaya | `/complete` | `/complete` | `/complete` | `ok` | Tasks pending 18 |

### Deployment vs product

| Finding | Type |
|---------|------|
| Prod ML classifies present/issue correctly; local pre-classifier does **not** | **Product** — local regex gap; prod deployment ahead for worker Hindi |
| Webhook path uses prod ML → attendance/issue **did persist** | Confirms backend workflow works when intent correct |
| Local ML alone would **miss** present/issue for these exact phrases | Customer on local-only ML stack would fail worker check-in |

### Local worker rating: **6/10**

Backend executed worker actions via prod ML webhook. Local ML HTTP would not classify present/issue for tested Hindi phrases. Completion phrase works on both.
