# Home Digital Twin

Property intelligence and maintenance platform: the Phase 1 MVP from the business proposal (§8).
Every property gets a structured digital record covering its spaces, assets, documents, warranties, maintenance and costs, plus an AI assistant on top.

## What's in the MVP

| Proposal scope | Where |
| --- | --- |
| Accounts and property creation | `/signup`, `/login`, `/properties/new` (starts you with typical rooms) |
| Rooms/areas and asset inventory | Property → Overview, nested spaces, asset pages |
| Asset profile: model, serial, purchase, warranty, service history | `/properties/[id]/assets/[assetId]` (age, expected-life and spend summary) |
| Document upload + AI extraction | Property → Documents. Upload a receipt, invoice, warranty card or label photo; Claude proposes asset, warranty, cost, service and maintenance data with per-field confidence; nothing is saved until you confirm |
| Maintenance schedules, reminders, work orders | Property → Maintenance (recurring tasks roll forward on completion and record a service entry and cost) and Work orders |
| AI chat over your own data | `/assistant`, grounded in the property record, with safety rules for electrical, gas and structural systems |
| Dashboard | `/dashboard`: overdue, next 30 days, warranties ending, replacement age, upkeep spend |

Out of scope for now, per the proposal: 3D, IoT, the technician marketplace and payments, and multi-property enterprise features. Reminders are shown in the app only; email and push notifications are not built yet.

## Stack

- Next.js 16 (App Router, Server Actions) with TypeScript and Tailwind CSS v4. Cache Components is turned off because every page is behind a login.
- Prisma 6 with SQLite for local development. Switch `provider` in `prisma/schema.prisma` to `postgresql` for production.
- Claude API (`@anthropic-ai/sdk`, model `claude-opus-5-5`) for document extraction (structured outputs) and the assistant (streaming, prompt caching). Server-side refusal fallbacks are enabled.
- Uploaded files are stored on local disk under `UPLOAD_DIR` and served only to their owner through `/api/documents/[id]`. Swap `src/lib/storage.ts` for S3 or GCS later.

## Getting started

```bash
npm install
cp .env.example .env    # then set SESSION_SECRET and ANTHROPIC_API_KEY
npx prisma migrate dev
npm run db:seed         # optional demo account and sample house (see prisma/seed.ts)
npm run dev
```

Open http://localhost:3000. Without `ANTHROPIC_API_KEY` everything works except AI extraction and the assistant, and the app says so where those features would appear.

## Layout

```
prisma/schema.prisma          data model (proposal §14)
prisma/seed.ts                demo data
src/lib/                      db, session/auth (data access layer), storage, formatting
src/lib/ai/                   Claude client, document extraction, assistant
src/app/(auth)/               signup / login
src/app/(app)/                signed-in app: dashboard, properties, assistant, providers
src/app/(app)/properties/*actions.ts   server actions (each re-checks ownership)
src/app/api/                  document file serving, extraction, assistant stream
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run db:migrate` · `npm run db:seed`
