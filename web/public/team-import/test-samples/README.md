# Team CSV test samples

Use during **onboarding step 3** (Add your team) or WhatsApp team bulk import.

Download locally: `http://localhost:3000/team-import/test-samples/<filename>`

Production: `https://www.munshidada.com/team-import/test-samples/<filename>`

## Recommended test order

| File | Scenario | Expected |
|------|----------|----------|
| `01-quick-smoke-2-employees.csv` | Fast sanity check (2 rows, General dept) | ✅ Preview + import: Added 2 |
| `02-sharma-mithai-team.csv` | Sweet shop — multiple departments | ✅ Departments auto-created on import |
| `03-mixed-doj-formats.csv` | ISO + DD-MM-YYYY + blank DOJ | ✅ Added 4 |
| `04-excel-phone-export.csv` | `+91`, 10-digit, and 12-digit phones | ✅ Phones normalized |
| `05-managers-and-workers.csv` | 2 managers + 4 workers | ✅ Added 6 |
| `06-sharma-mithai-8-workers.csv` | Larger team (8 rows) | ✅ Added 8 |
| `07-should-fail-wrong-headers.csv` | Wrong column names | ❌ Preview error: Missing columns |
| `08-should-fail-invalid-role.csv` | Role `SUPERVISOR` | ✅ Preview OK · ❌ Import: role failed |

## Re-import note

Uploading the same phone numbers again **skips** rows already linked to your business. Use a fresh signup or change phones (test range `919900000xxx`) for a clean count.

## Canonical columns

```
name,phone,role,department,doj
```

- **role:** `WORKER` or `MANAGER` only
- **department:** matches existing team name, or a new one is created (owner only)
- **doj:** optional — `YYYY-MM-DD` or `DD-MM-YYYY`
