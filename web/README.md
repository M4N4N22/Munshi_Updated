# Munshi Web

Next.js app for [munshi.app](https://munshi.app) — onboarding and (later) admin dashboard.

Deploy on **Vercel**. Talks to the Nest API in `../Munshi_Updated` (EC2 in production).

## Setup

```bash
cd munshi-web
cp .env.example .env.local
# Edit .env.local — set WHATSAPP_BUSINESS_NUMBER for the Open WhatsApp redirect
npm install
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (`http://localhost:4001` dev, `https://api.munshi.app` prod) |
| `WHATSAPP_BUSINESS_NUMBER` | Server-only — `/api/whatsapp` redirect (91 + 10 digits) |
| `NEXT_PUBLIC_BOOK_DEMO_URL` | Book demo button |
| `NEXT_PUBLIC_YOUTUBE_URL` | Watch video button |

## OTP

1. User enters phone → `POST {API}/onboarding/otp/send`
2. User enters 6-digit SMS code → `POST {API}/onboarding/otp/verify`
3. **Open WhatsApp** → `/api/whatsapp?text=START`

Without MSG91, the API logs the OTP and returns `dev_otp` in non-production (see backend `.env`).

Never put database URLs, Olli keys, or Meta tokens in this app.

## Vercel

1. Import the **monorepo** root or this folder as the project.
2. Set **Root Directory** to `munshi-web`.
3. Add the env vars above for Production / Preview.
4. Map `munshi.app` to the project.

## Backend CORS

When going live, add your web origin to the API:

```env
CORS_ORIGIN=https://munshi.app,http://localhost:3000
```

## Onboarding flow (current)

1. User enters mobile → SMS OTP (verified on API).
2. WhatsApp handoff via server redirect.
3. `POST /onboarding/register` → creates factory + owner (`users` + `factory_users`) + WhatsApp onboarding template.
