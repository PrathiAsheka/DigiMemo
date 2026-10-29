# DigiMemo

A property intelligence and maintenance platform for homes, apartments and businesses. Every property gets a structured digital record of its rooms, equipment, documents, warranties, maintenance, work orders and costs, plus alerts that warn you before something is due, expires or wears out.

## Features

| Area | What it does |
| --- | --- |
| Landing page | `/`: what the app does, who it's for, and sign-up / sign-in |
| Accounts | Email and password or "Continue with Google"; `/account` to change name and password, see sign-in methods, or delete the account and all its data |
| Onboarding | First sign-in asks what you manage (home, apartment, company or other place); wording, typical rooms and suggestions follow that choice |
| Properties and rooms | Nested spaces (building → floor → room), with one-click "add a typical room" |
| Members | The people at each place (family, tenants, staff) with role, date of birth and contacts. Certificates and other personal documents are linked to a member, and the Documents tab groups everything by member |
| Equipment | Model, serial, purchase and install dates, expected life, status and notes; typical equipment is suggested per room (Home → Kitchen → Refrigerator / Oven / Washing machine) |
| Product photos | Front view, model / serial label and more, from the phone camera or a file; the front view is the item's thumbnail everywhere |
| Warranties and contracts | Per item, with time left shown on every page |
| Maintenance | Recurring and one-off tasks; marking one done logs the service and cost and schedules the next |
| Work orders | Repairs from reported to fixed: provider, priority, schedule, custom statuses and cost |
| Documents | Receipts, manuals, warranty cards and certificates stored with the equipment they belong to; optional AI reading of receipts and label photos, reviewed before anything is saved |
| Costs | Every purchase, service and repair, yearly upkeep, and the items costing the most |
| Service providers | Your own list of technicians, with tap-to-call, email, notes and job history |
| Alerts | Bell in the header and `/alerts`: maintenance due or overdue, warranties and contracts ending, ageing equipment, urgent jobs, scheduled visits, broken equipment and documents to review. Alerts clear themselves when resolved; snooze, dismiss and per-user lead times. Optional device notifications: the app asks each user's permission first ("Turn on notifications" on the Alerts page, or the invitation on the dashboard), then shows new urgent and upcoming alerts while the app is open |
| Dashboard | Urgent items first, then what's coming up, open jobs, ending warranties, recent work and replacement planning |
| Languages and themes | English (default) and Sinhala, switched with EN / සිං in the header or on `/account`; the choice is saved per user, so alerts are written in it too. Light (default) and dark themes via the sun / moon button |
| Forms | Every dropdown has "Other…" with a text box for your own value; typed rooms, equipment and providers are created on save |

Out of scope for now: 3D, IoT sensors, the technician marketplace and payments. Device notifications work while the app is open in a browser tab; notifications when it's closed (web push) and email reminders are not built yet.

## Stack

- Next.js 16 (App Router, Server Actions) with TypeScript and Tailwind CSS v4.
- Prisma 6 with PostgreSQL (Prisma Postgres on Vercel; `npx prisma dev` or any Postgres locally).
- Uploaded files go to a private Vercel Blob store when `BLOB_READ_WRITE_TOKEN` is set, otherwise to the local `UPLOAD_DIR` folder (`src/lib/file-store.ts`). Either way they are served only to their owner through `/api/documents/[id]`.
- Optional AI document reading through a hosted AI API (see below).

## Getting started

```bash
npm install
cp .env.example .env    # then set SESSION_SECRET
npx prisma dev          # local Postgres; keep it running and copy the postgres:// URL it prints
                        # into DATABASE_URL (add pgbouncer=true& after the ?)
npx prisma migrate dev
npm run db:seed         # optional demo data: a homeowner account (house, apartment, beach house, office)
                        # and a business account (café + warehouse); logins are in prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

### AI document reading (optional)

Uploading a receipt, warranty card or label photo can fill in the equipment, warranty and cost details for you to check before saving. It's off by default and everything else works without it. To turn it on, set `ANTHROPIC_API_KEY` in `.env` (a hosted AI API, paid per use) and restart `npm run dev`.

### Google sign-in

"Continue with Google" works once the server has OAuth credentials:

1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI `http://localhost:3000/api/auth/google/callback` (plus your production URL's equivalent).
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` (set `APP_URL` in production) and restart the server.

A Google account is linked to an existing account with the same email only when Google reports the email as verified. Email and password sign-in keeps working alongside it.

## Deploying to Vercel

Vercel can't keep files between requests, so the database and uploads live in hosted services:

1. **Database:** in the Vercel project, open **Storage → Create Database → Prisma Postgres** (free tier) and connect it to the project. This adds `DATABASE_URL`. (With Neon instead, set `DATABASE_URL` to its unpooled connection string.)
2. **Uploads:** **Storage → Create → Blob**, choose **Private** access, and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
3. **Settings → Environment Variables:** add `SESSION_SECRET` (32+ random characters, see `.env.example`). For Google sign-in also add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_URL` (your site's address), and add `<APP_URL>/api/auth/google/callback` as a redirect URI in Google Cloud.
4. **Redeploy.** The build runs `prisma migrate deploy` first, so the tables are created automatically.

Optional demo data on the live site: put the production `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in a local `.env` and run `npm run db:seed`. The demo logins are public in `prisma/seed.ts`, so change them first or skip this for a public site.

## Layout

```
prisma/schema.prisma                 data model
prisma/seed.ts, demo-images.ts       demo data and generated product photos
src/app/page.tsx                     public landing page
src/app/(auth)/                      sign up / sign in
src/app/(onboarding)/welcome/        "what will you look after?" choice
src/app/(app)/                       signed-in app: dashboard, properties, alerts, providers, account
src/app/(app)/properties/*actions.ts server actions (each re-checks ownership)
src/app/api/                         document files, AI extraction, Google sign-in
src/lib/                             db, session/auth, alerts, profiles, room templates, storage, formatting
src/i18n/                            language and theme cookies, translator, en.ts / si.ts dictionaries
src/lib/ai/                          optional AI document extraction
src/components/                      UI building blocks, photos, illustrations
```

To add or change wording, edit `src/i18n/messages/en.ts` and give the same key a translation in `si.ts` (TypeScript reports any missing key).

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run db:migrate` · `npm run db:seed`
