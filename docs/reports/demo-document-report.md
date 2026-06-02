# Demo Document Upload Report

## Capability Status

Document processing is **functional** for structured CSV import via the REST upload pipeline. WhatsApp media ingestion is not wired in the current webhook handler; the demo uses a **controlled, intentional flow**.

## Demo Assets

| File | Rows | Content |
|------|------|---------|
| `demo-assets/inventory-import-demo.csv` | 5 SKUs | Steel Sheets, Aluminium Rods, Copper Wire, etc. |
| `demo-assets/vendor-import-demo.csv` | 3 vendors | Gupta Metals, Sharma Packaging, Precision Tools |
| `demo-assets/employee-import-demo.csv` | 3 employees | Operations/Sales/Inventory workers |

## Recommended Demo Flow (Section 9)

**Before recording (prep):** Upload is triggered once via API to confirm pipeline health.

**During recording (natural language):**

1. **Owner:** "Munshi, inventory list upload karni hai" or continue business discovery document bucket if already in discovery session.
2. **Owner:** Sends `inventory-import-demo.csv` as WhatsApp document attachment (if Meta delivery works) **OR** narrates: "maine inventory CSV bheji hai" after pre-staging upload in the same session.
3. **Munshi:** Confirms document received, shows extraction suggestions (5 inventory import suggestions generated in validation).

## Validation Result

| Check | Result |
|-------|--------|
| Upload `POST /documents/upload` | ✅ 201 |
| Document ID | 2 |
| Suggestions generated | 5 |
| Workflow started | Yes |

## Expected Outputs

- Document status progresses: UPLOADED → PROCESSING → EXTRACTED → SUGGESTED
- Suggestion types: `INITIAL_INVENTORY_IMPORT` per CSV row
- Owner approves suggestions through existing suggestion approval workflow (if time permits; otherwise show suggestions list only)

## Failure Avoidance

Do **not** demo ledger, bank statement, or unknown document types. Stick to `INVENTORY_IMPORT` CSV only.
