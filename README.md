# Munshi

Monorepo for the Munshi factory operations platform (WhatsApp-first).

| Package | Path | Stack | Dev |
|---------|------|-------|-----|
| **Backend** | [`backend/`](backend/) | NestJS, PostgreSQL | `cd backend && yarn start` |
| **ML** | [`ml/`](ml/) | FastAPI intent classifier | `cd ml && python -m uvicorn main:app --reload --port 8000` |
| **Web** | [`web/`](web/) | Next.js dashboard | `cd web && npm run dev` |

## Local setup

1. Copy env files:
   - `backend/.env.example` → `backend/.env`
   - `ml/.env.example` → `ml/.env` (OpenAI key for classify)
2. Start Postgres (Supabase or local `docker compose`).
3. Run ML on port **8000**, backend on **4001** with `ML_URL=http://localhost:8000`.
4. Point Olli webhook at your tunnel → `http://localhost:4001/webhook`.

## Contracts

Intent and workflow contracts live in `backend/contracts/`. Keep `ml/contracts/` in sync when changing ML intents (run backend contract drift tests).

## Migrations

```bash
cd backend
yarn migrate
yarn migrate:status
```

## Docker (backend + Postgres)

```bash
docker compose -f docker-compose.example.yml up --build
```

## Former standalone repos

This repository replaces separate GitHub repos for backend, ML, and web. Historical remotes:

- Backend: `ShantanuGarg2004/Munshi_Updated` (this repo)
- ML: `ShantanuGarg2004/munshi_intent_classifier`
