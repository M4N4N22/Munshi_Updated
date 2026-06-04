# Munshi Web

Next.js frontend for **[munshi.app](https://munshi.app)** — factory onboarding (OTP + registration) and, over time, team/admin dashboard features.

**Monorepo root:** [../README.md](../README.md)  
**Related:** [Backend API](../backend/README.md) · [ML service](../ml/README.md) (web does not call ML directly)

---

## Role in the system

| Step | What happens |
|------|----------------|
| 1 | User opens `/onboarding`, enters mobile number |
| 2 | Web calls backend `POST /onboarding/otp/send` and `otp/verify` |
| 3 | User completes factory registration via `POST /onboarding/register` |
| 4 | **Open WhatsApp** — server route `/api/whatsapp` redirects to `wa.me` with prefilled `START` |
| 5 | Owner continues setup in WhatsApp (business discovery, team, operations) |

The web app holds **no** database credentials, Olli keys, or Meta tokens — only public API URL and WhatsApp business number.

---

## Current progress

| Feature | Status |
|---------|--------|
| Onboarding UI | Phone → OTP → register form (`components/onboarding/onboarding-form.tsx`) |
| WhatsApp handoff | `/api/whatsapp` redirect using `WHATSAPP_BUSINESS_NUMBER` |
| API client | `lib/api/client.ts`, `lib/api/onboarding.ts` |
| Marketing links | Optional book-demo and YouTube URLs via env |
| Admin dashboard | Planned; not the focus of this package yet |

After onboarding, team management for assign flows can also happen via WhatsApp buttons (Google Form / Dashboard / WhatsApp onboard) configured on the **backend** — see [backend/README.md](../backend/README.md).

---

## Team CSV template (WhatsApp bulk add)

Owners download a ready-made CSV from Vercel static files:

- **File:** `public/team-import/munshi-team-template.csv`
- **URL after deploy:** `https://munshi.app/team-import/munshi-team-template.csv`

Edit only this file when changing columns or sample rows; the backend WhatsApp flow links here (not the API).

---

## Project layout

```
web/
├── public/team-import/            # WhatsApp bulk-import CSV template
├── app/
│   ├── onboarding/page.tsx
│   ├── api/whatsapp/route.ts      # wa.me redirect
│   └── page.tsx
├── components/onboarding/
├── lib/api/                       # Backend client
├── lib/config.ts
├── .env.example
└── package.json
```

---

## Prerequisites

- Node.js 20+
- Backend running at `NEXT_PUBLIC_API_URL` (default `http://localhost:4001`)

---

## Setup

```bash
cd web
npm install
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL and WHATSAPP_BUSINESS_NUMBER
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding).

---

## Environment

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | Public | Backend base URL (`http://localhost:4001` dev, `https://api.munshi.app` prod) |
| `WHATSAPP_BUSINESS_NUMBER` | Server | `wa.me` target for `/api/whatsapp` (91 + 10 digits) |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | Public | Optional display / client use |
| `NEXT_PUBLIC_BOOK_DEMO_URL` | Public | Book demo button |
| `NEXT_PUBLIC_YOUTUBE_URL` | Public | Watch video button |

Never put `POSTGRES_CONNECTION_STRING`, `OLLI_KEY`, or OpenAI keys in this app.

---

## OTP behavior (dev vs prod)

1. `POST {API}/onboarding/otp/send` — SMS via MSG91 when configured on backend  
2. `POST {API}/onboarding/otp/verify` — Validates code  
3. Without MSG91, backend logs OTP and may return `dev_otp` in non-production  

See backend `.env` for `OTP_PEPPER` and MSG91 settings.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

---

## Backend CORS

When testing against a local API, ensure backend allows the web origin:

```env
# backend/.env
CORS_ORIGIN=http://localhost:3000,https://munshi.app
```

---

## Deploy on Vercel

1. Import the **Munshi_Updated** repository.
2. Set **Root Directory** to **`web`** (not the old `munshi-web` folder name).
3. Add environment variables for Production / Preview (table above).
4. Map `munshi.app` to the project.

The API remains on EC2 / `api.munshi.app`; only this Next app is on Vercel.

---

## Monorepo note

This package was **`munshi-web`** as a separate repo. It now lives at **`web/`** in [Munshi_Updated](https://github.com/ShantanuGarg2004/Munshi_Updated). Clone the monorepo and `cd web` for all frontend work.

---

## Former standalone repo

Standalone `munshi-web` → **`web/`** here. Update bookmarks and Vercel root directory accordingly.
