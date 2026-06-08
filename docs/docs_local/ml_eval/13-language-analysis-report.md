# Language Analysis Report (Expanded)

| Style | N | Accuracy | Fail rate | Top failure pattern | Root cause |
|-------|---|----------|-----------|---------------------|------------|
| English | 53 | 79.2% | 20.8% | `/absent` → `general_chat` | LLM misses non-slash paraphrases; deterministic covers only keyword-rich forms |
| Hindi | 28 | 78.6% | 21.4% | `/assign` → `general_chat` | Strong operational regex; fails when phrasing outside _RE patterns |
| Hinglish | 32 | 65.6% | 34.4% | `/present` → `general_chat` | Mixed token order; dept/mgr intents weak |
| Mixed | 12 | 33.3% | 66.7% | `/inventory_status` → `general_chat` | Low-stock ambiguous between /inventory_status and /purchase_request_create |
| Broken English | 28 | 28.6% | 71.4% | `/present` → `general_chat` | LLM training alignment poor; no typo tolerance |
| MSME | 28 | 46.4% | 53.6% | `/assign` → `general_chat` | Short verb-first phrases hit wrong layer or general_chat |
| Typos | 28 | 14.3% | 85.7% | `/present` → `general_chat` | No fuzzy match; LLM does not correct OCR-style input |
| Short | 28 | 39.3% | 60.7% | `/present` → `general_chat` | Insufficient tokens for LLM; regex needs anchors |
| Conversational | 28 | 21.4% | 78.6% | `/assign` → `/assign_clarify` | Long context not in few-shot; defaults to general_chat |
| Contextual | 28 | 32.1% | 67.9% | `/absent` → `general_chat` | Temporal references not linked to intent |
| Ambiguous | 28 | 42.9% | 57.1% | `/present` → `general_chat` | System guesses instead of clarify workflow |
| Multi-intent | 28 | 42.9% | 57.1% | `/mgrassign` → `/assign` | Single-intent architecture takes first match |