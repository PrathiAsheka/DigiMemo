# DigiMemo

A property intelligence and maintenance platform for homes, apartments and businesses. Every property gets a structured digital record of its rooms, equipment, documents, warranties, maintenance, work orders and costs, plus alerts that warn you before something is due, expires or wears out.

## Features

| Area | What it does |
| --- | --- |
| Landing page | `/`: what the app does, who it's for, and sign-up / sign-in |
| Accounts | Email and password or "Continue with Google"; `/account` to change name and password, see sign-in methods, or delete the account and all its data |
| Onboarding | First sign-in asks what you manage (home, apartment, company or other place); wording, typical rooms and suggestions follow that choice |
| Properties and rooms | Nested spaces (building → floor → room), with one-click "add a typical room" |
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
| Forms | Every dropdown has "Other…" with a text box for your own value; typed rooms, equipment and providers are created on save |

Out of scope for now: 3D, IoT sensors, the technician marketplace and payments. Device notifications work while the app is open in a browser tab; notifications when it's closed (web push) and email reminders are not built yet.

## Stack

- Next.js 16 (App Router, Server Actions) with TypeScript and Tailwind CSS v4.
- Prisma 6 with SQLite for local development. Switch `provider` in `prisma/schema.prisma` to `postgresql` for production.
- Uploaded files are stored on local disk under `UPLOAD_DIR` and served only to their owner through `/api/documents/[id]`. Swap `src/lib/storage.ts` for S3 or GCS in production.
- Optional AI document reading through a hosted AI API or a free local model (see below).

## Getting started

```bash
npm install
cp .env.example .env    # then set SESSION_SECRET
npx prisma migrate dev
npm run db:seed         # optional demo data: a homeowner account (house, apartment, beach house, office)
                        # and a business account (café + warehouse); logins are in prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

### AI document reading (optional)

Uploading a receipt, warranty card or label photo can fill in the equipment, warranty and cost details for you to check. Everything else works without it. Choose a provider with `AI_PROVIDER` in `.env`:

| | Hosted API (`AI_PROVIDER=anthropic`, default) | Ollama (`AI_PROVIDER=ollama`) |
| --- | --- | --- |
| Cost | Paid per use (`ANTHROPIC_API_KEY`) | Free |
| Privacy | Sent to the AI provider's API | Never leaves your computer |
| Quality | Reads receipts and labels reliably | Good enough to try; check extracted fields more carefully |
| Needs | Internet | A PC with 8 GB+ RAM (a GPU makes it much faster); only works while it's on |

To use Ollama:

1. Install Ollama from https://ollama.com.
2. Download a vision model, which can read photos of receipts and labels:
   ```bash
   ollama pull qwen2.5vl:3b
   ```
   (`qwen2.5vl:7b` is more accurate but needs about 8 GB of free memory.)
3. In `.env` set `AI_PROVIDER="ollama"` and `OLLAMA_MODEL="qwen2.5vl:3b"`, then restart `npm run dev`.

With Ollama, PDFs are read from their text layer; for scanned PDFs, upload a photo instead. `OLLAMA_NUM_CTX` (default 8192) sets the model's context size; larger is slower on small graphics cards.

### Google sign-in

"Continue with Google" works once the server has OAuth credentials:

1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI `http://localhost:3000/api/auth/google/callback` (plus your production URL's equivalent).
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` (set `APP_URL` in production) and restart the server.

A Google account is linked to an existing account with the same email only when Google reports the email as verified. Email and password sign-in keeps working alongside it.

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
src/lib/ai/                          document extraction (hosted API or Ollama)
src/components/                      UI building blocks, photos, illustrations
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run db:migrate` · `npm run db:seed`
