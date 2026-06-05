# Munshi Backend

NestJS API for Munshi: WhatsApp webhooks (via Olli), workflow engine, factory onboarding, inventory, vendors, purchase requests, and business discovery.

**Monorepo root:** [../README.md](../README.md)  
**Related:** [ML service](../ml/README.md) · [Web app](../web/README.md)

---

## Role in the system

| Responsibility | Details |
|----------------|---------|
| **WhatsApp** | `POST /webhook` — verify + receive Olli payloads; route messages through ML and workflows |
| **ML integration** | `ML_URL` → `POST /classify`, `/convert`, `/parse` on the Python service |
| **Workflows** | Stateful sessions in Postgres; slash commands and ML intents start handlers |
| **REST APIs** | Onboarding OTP, vendors, inventory, purchase requests, business discovery |
| **Contracts** | Source of truth for intents/workflows: [`contracts/`](contracts/README.md) |

---

## Current progress (features shipped)

### WhatsApp and messaging

- Olli inbound parser supports text, media, and **interactive button replies** (button title mapped to internal action IDs).
- **Empty team** on assign flows: three reply buttons — Google Form, Dashboard, WhatsApp onboard — instead of typing `/onboard_worker`.
- Google Form / Dashboard taps send **plain text + URL** (Olli returns 500 for interactive `cta_url`).
- Env: `ONBOARD_WORKER_GOOGLE_FORM_URL`, `MUNSHI_TEAM_DASHBOARD_URL` (see `.env.example`).

### Workflows (`src/services/workflow/`)

| Workflow | Start command | Handler |
|----------|---------------|---------|
| Vendor onboarding | `/onboard_vendor` | `vendor-onboarding.handler.ts` |
| Worker onboarding | `/onboard_worker` | `worker-onboarding.handler.ts` |
| Inventory create | `/inventory_create` | `inventory-create.handler.ts` |
| Purchase request | `/purchase_request_create` | `purchase-request-create.handler.ts` |
| Suggestion approval | `/suggestion_approve` | `suggestion-approval.handler.ts` |
| Business discovery | `/business_discovery`, `/continue_discovery` | `business-discovery.handler.ts` |
| **Assign clarify** | `/assign_clarify` | `assign-clarify.handler.ts` |

**Assign clarify** — When the factory has no team (or assignee is unclear), ML classifies vague Hindi/Hinglish like *“Aaj 4 website banegi”* as `/assign_clarify` with `task_description`; the backend runs a short workflow and can show team-setup buttons.

### Business discovery

- REST under `/business-discovery` (progress, buckets, readiness, pause/resume).
- WhatsApp-driven setup merged from `main` (migrations `007_business_discovery.sql`, `008_business_discovery_expansion.sql`).

### Other domains

- **Onboarding:** `POST /onboarding/otp/send`, `otp/verify`, `register` (used by web).
- **Inventory / vendors / purchase requests** — CRUD and approval flows with audit trails.
- **Document processing** — Forwards files to ML `/parse` where applicable.

---

## Project layout

```
backend/
├── contracts/          # intent-types.json, workflow-types.json, JSON schemas
├── migrations/         # numbered SQL migrations
├── src/
│   ├── modules/
│   │   ├── whatsapp/   # webhook controller + whatsapp.service (routing)
│   │   └── onboarding/
│   ├── services/
│   │   ├── workflow/   # engine, registry, handlers
│   │   ├── business-discovery/
│   │   ├── inventory/, vendors/, purchase-requests/
│   ├── core/
│   │   └── messaging/  # Olli outbound, interactive buttons, team-setup-outbound
│   └── ...
├── scripts/            # migrate, docker-entrypoint
├── .env.example
└── Dockerfile
```

**Key files for recent work**

| File | Purpose |
|------|---------|
| `src/modules/whatsapp/whatsapp-inbound.parser.ts` | Parse Olli payloads + interactive replies |
| `src/core/messaging/whatsapp-interactive.constants.ts` | Button IDs and title → action mapping |
| `src/core/messaging/team-setup-outbound.ts` | Empty-team buttons and link replies |
| `src/services/workflow/workflow-engine.service.ts` | Intent → workflow routing |
| `src/services/workflow/handlers/assign-clarify.handler.ts` | Assign clarify steps |

---

## Prerequisites

- Node.js 20+
- Yarn
- PostgreSQL (Supabase session pooler or local)
- ML service running at `ML_URL` (default `http://localhost:8000`)

---

## Setup

```bash
cd backend
yarn install
cp .env.example .env
# Edit POSTGRES_CONNECTION_STRING, OLLI_KEY, ML_URL, team setup URLs, etc.
yarn migrate
yarn start          # port 4001
# or hot reload:
yarn dev            # uses .env.local if present
```

### Important environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `4001`) |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL / Supabase |
| `ML_URL` | Intent classifier base URL — **use `http://localhost:8000` for local dev** |
| `OLLI_URL`, `OLLI_KEY` | WhatsApp send/receive via GetOlli |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `ONBOARD_WORKER_GOOGLE_FORM_URL` | Link for “Google Form se add” button |
| `MUNSHI_TEAM_DASHBOARD_URL` | Link for “Dashboard par add” (default `https://munshi.app`) |
| `CORS_ORIGIN` | Web origins (e.g. `http://localhost:3000`) |
| `OTP_PEPPER` | OTP hashing (production) |

Never commit `.env` with real secrets.

---

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start` | Run API with `.env` |
| `yarn dev` | Watch mode |
| `yarn migrate` | Apply pending SQL migrations |
| `yarn migrate:status` | Show migration state |
| `yarn test` | Jest unit tests |
| `yarn lint` | ESLint |

---

## Testing

```bash
yarn test
# Focused examples:
yarn test whatsapp-inbound.parser
yarn test team-setup-outbound
yarn test contract-drift
yarn test workflow-routing
```

Contract drift ensures `contracts/` matches what ML and handlers expect.

---

## Migrations

Applied in order from `migrations/`:

- `000`–`006` — Core, TraderOS, vendors, workflows, inventory, documents, procurement  
- `007` — Business discovery + P0 finance foundation  
- `008` — Business discovery expansion  

```bash
yarn migrate
yarn migrate:status
```

Health: `GET /health/migrations` (when enabled).

---

## WhatsApp local testing

1. Start ML on port 8000 and backend on 4001.
2. Expose backend with ngrok/cloudflared: `https://<tunnel>/webhook`.
3. Configure Olli webhook URL to that endpoint.
4. Send messages from WhatsApp; check backend logs for classify intent and workflow steps.

**Interactive buttons:** Olli may send `type: interactive` with `data.text` equal to the **button title**, not the internal id — the inbound parser normalizes titles via `resolveTeamSetupActionId()`.

---

## Docker and production

- **Dockerfile** in this folder; build context is `./backend` from monorepo root.
- **CI:** [.github/workflows/cicd.yml](../.github/workflows/cicd.yml) — migration validation + deploy on `main`.
- **Compose:** [../docker-compose.example.yml](../docker-compose.example.yml) — `backend` + `ml` + `postgres`; set `ML_URL=http://ml:8000` inside compose.

Historical EC2 path may still be `/home/ubuntu/munshi-dada` — after monorepo merge, align deploy scripts to the new `backend/` context.

---

## Contracts

When adding intents or workflows:

1. Edit `contracts/intent-types.json` and/or `workflow-types.json`.
2. Sync copies to `../ml/contracts/`.
3. Register handler in `workflow.registry.ts` and `workflow.module.ts`.
4. Run `yarn test -- contract-drift`.

Full contract docs: [contracts/README.md](contracts/README.md).

---

## P2 roadmap — inventory & task-linked stock

Implementation guide for teammates (phased todos, schema, agent prompts):

**[../docs/p2-inventory-task-integrations.md](../docs/p2-inventory-task-integrations.md)**

Start with **Phase 0** (task completion → `recordStockOut` with `reference_type: TASK`) before Zoho OAuth.
