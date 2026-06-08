# Munshi Web

Next.js frontend for **[munshi.app](https://munshi.app)** — landing page ([Munshi-Dada](https://github.com/ShantanuGarg2004/Munshi-Dada)) plus OTP onboarding and WhatsApp handoff.

**Monorepo root:** [../README.md](../README.md)  
**Backend:** [../backend/README.md](../backend/README.md)

---

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing landing (hero, features, demo, FAQ) |
| `/onboarding` | Phone OTP → factory registration → WhatsApp `START` |
| `/api/whatsapp` | Redirect to `wa.me` with prefilled message |
| `/privacy` | Privacy policy |
| `/admin` | Leads admin (from landing) |

---

## Team CSV template (WhatsApp bulk add)

- **File:** `public/team-import/munshi-team-template.csv`
- **URL after Vercel deploy:** `https://munshi-dada.vercel.app/team-import/munshi-team-template.csv`

Backend WhatsApp flow uses this URL by default (`MUNSHI_TEAM_CSV_TEMPLATE_URL` optional override).

---

## Inventory CSV template (WhatsApp / REST bulk import)

- **File:** `public/inventory-import/munshi-inventory-template.csv`
- **URL after Vercel deploy:** `${MUNSHI_WEB_URL}/inventory-import/munshi-inventory-template.csv`
- **Example:** `https://munshi-dada.vercel.app/inventory-import/munshi-inventory-template.csv`

Required columns: `sku`, `name`, `category`, `location`, `unit`, `quantity`. Optional: `reorder_threshold`.

Owners/managers: send filled CSV via WhatsApp (`/inventory_import_csv`) or `POST /inventory/import/csv`.

Optional override: `MUNSHI_INVENTORY_CSV_TEMPLATE_URL` (see `backend/.env.example`).

---

## Vercel deploy (monorepo)

1. Connect repo **`ShantanuGarg2004/Munshi_Updated`**
2. **Root Directory:** `web`
3. Env: see `.env.example`
4. Domain: `munshi.app`

Previously deployed from [Munshi-Dada](https://github.com/ShantanuGarg2004/Munshi-Dada) at repo root; this folder replaces that app.

---

## Local dev

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

- Landing: http://localhost:3000  
- Onboarding: http://localhost:3000/onboarding  

---

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Nest API (`http://localhost:4001` dev) |
| `WHATSAPP_BUSINESS_NUMBER` | Server `wa.me` redirect |
| `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER` | Optional client display |
| `NEXT_PUBLIC_BOOK_DEMO_URL` | Onboarding “Book demo” link |
| `NEXT_PUBLIC_YOUTUBE_URL` | Onboarding video link |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
