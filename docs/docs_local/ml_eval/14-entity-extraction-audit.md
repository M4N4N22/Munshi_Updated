# Entity Extraction Audit

## Classify path entities

| Field | Accuracy | N | Common failure modes |
|-------|----------|---|----------------------|
| Worker names | 20.8% | 24 | `@ram aaj warehouse saaf karo`; `Please ask Ram to clean the wa` |
| Departments | 0.0% | 11 | `/depart_assign sales today fig`; `Ask sales team to send today f` |
| Task IDs | 29.5% | 44 | `/mgrassign @priya 15`; `15 priya ko` |
| Worker names (extract) | 71.4% | 21 | `Please deliver 20 bags of ceme`; `ram cement le jaaye` |
| Quantities | 100.0% | 20 | — |
| Inventory items/SKU | 40.9% | 22 | `Please deliver 20 bags of ceme`; `Ram ko 20 bag cement issue kar` |
| Task kind | 51.4% | 35 | `Ram ko 20 cement de do`; `Ram ko 20 bag cement issue kar` |

## Root causes

1. **LLM entity fields often null** when intent wrong — entity acc tied to intent acc
2. **depart_slug 0%** — slug only set when dept keyword regex fires; LLM slug not validated
3. **worker_slug 21%** — mention extraction works on `@` but not bare names in LLM path
4. **task id 30%** — regex `_HAS_TASK_ID_RE` misses informal Hindi task references
5. **Inventory extractor** — requires `ko` pattern + qty + item; breaks on reorder, typos, bare material
6. **issue vs delivery** — `issue karo` verb triggers wrong task_kind on delivery phrases