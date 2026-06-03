# Munshi ML Service

FastAPI service for **intent classification**, **WhatsApp message conversion**, and **document parsing** (inventory import, stock register, etc.). The Nest backend calls this service via `ML_URL`.

**Monorepo root:** [../README.md](../README.md)  
**Related:** [Backend](../backend/README.md) · [Web](../web/README.md)

---

## Role in the system

```
User message (WhatsApp)
    → Backend POST ML_URL/classify?message=...
        → CommandParser (slash commands first)
        → IntentClassifier (regex rules + OpenAI)
    → Backend routes intent to commands or workflows
```

Backend also uses:

- `POST /convert` — Rewrite bot-style text into natural English for outbound WhatsApp.
- `POST /parse` — Extract structured data from uploaded documents (base64).

---

## Current progress

| Capability | Status |
|------------|--------|
| Hybrid classify (EN / HI / Hinglish) | Slash parser → deterministic rules → LLM |
| Workflow intents | `/onboard_vendor`, `/onboard_worker`, `/inventory_*`, `/purchase_request_create`, `/business_discovery`, etc. |
| **`/assign_clarify`** | Pre-classifier for vague assignment phrases without `@mention` (e.g. “aaj website banegi”) |
| Contract alignment | `ml/contracts/` mirrors `backend/contracts/` |
| Document parsers | Router under `parsers/` (stock register, inventory import, …) |
| Tests | `tests/test_assign_clarify.py`, `test_workflow_intent.py`, `test_contract.py`, operational intent suites |

### Assign clarify (recent)

Messages that describe work to do but do not name an assignee can be classified as `/assign_clarify` with a `task_description` field. Examples covered in tests:

- “aaj website banegi” → `/assign_clarify`, task mentions website  
- Not triggered when `@user` is present or for unrelated phrases (“aaj mein present hu”)

Implementation: `assign_clarify_pre_classify()` and hybrid path in `bot_engine.py`.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check |
| `POST` | `/classify?message=...` | Intent + slots (command parser short-circuits slash input) |
| `POST` | `/convert?message=...` | Plain-English rewrite for outbound messages |
| `POST` | `/parse` | JSON body: `factory_id`, `file_name`, `mime_type`, `content_base64`, optional `document_type` |

**Classify response** shape is defined in `contracts/schemas/classify-response.json` and Pydantic models in `contracts/python/`.

---

## Project layout

```
ml/
├── main.py              # FastAPI app, lifespan loads classifier
├── bot_engine.py        # IntentClassifier, CommandParser, WaMessageConverter, pre-rules
├── contracts/           # Synced from backend/contracts (see contracts/README.md)
├── parsers/             # Document extraction routers
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## Prerequisites

- Python 3.11+ (match Docker image if deploying)
- OpenAI API key

---

## Setup

```bash
cd ml
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENAI_API_KEY in .env (do not commit real keys)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify:

```bash
curl "http://localhost:8000/health"
curl -X POST "http://localhost:8000/classify?message=aaj%20website%20banegi"
```

Backend must use:

```env
ML_URL=http://localhost:8000
```

---

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | Classify, convert, and LLM fallbacks |

Host/port/model are currently hardcoded in `main.py` / `bot_engine.py` (`0.0.0.0:8000`, `gpt-4.1-mini`). See comments in `.env.example` for ops reference.

---

## Testing

```bash
cd ml
pip install -r requirements.txt
pytest
# Focused:
pytest tests/test_assign_clarify.py -v
pytest tests/test_contract.py -v
pytest tests/test_workflow_intent.py -v
```

---

## Keeping contracts in sync

**Source of truth:** `../backend/contracts/`

When backend changes intents or classify schema:

1. Copy updated JSON / python models into `ml/contracts/`.
2. Run backend: `cd ../backend && yarn test -- contract-drift`
3. Run ML: `pytest tests/test_contract.py`

Catalog: [contracts/README.md](contracts/README.md) · Intent list: `contracts/intent-types.json` (includes `/assign_clarify`, `/business_discovery`, `general_chat`, …).

---

## Docker

```bash
# From monorepo root
docker compose -f docker-compose.example.yml up ml --build
```

Or build standalone:

```bash
cd ml
docker build -t munshi-ml .
docker run -p 8000:8000 --env-file .env munshi-ml
```

Backend in compose uses `ML_URL=http://ml:8000`.

---

## Deployment notes

Historically this service lived in repo **`munshi_intent_classifier`** and was deployed to EC2 alongside the API. In the monorepo, deploy **`ml/`** as its own container or process and point production `ML_URL` at that host — not at a stale dev IP during local work.

---

## Former standalone repo

`ShantanuGarg2004/munshi_intent_classifier` → now **`ml/`** in [Munshi_Updated](https://github.com/ShantanuGarg2004/Munshi_Updated). Prefer this path for all new changes.
