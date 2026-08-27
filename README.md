# Ticketing Portal

A small portal for handling ticket requests on a first-come-first-served basis,
without the coordinator ever picking up a phone.

## How it works

1. **Request** — a requester fills in name, mobile number, ticket category
   (Class A / B / C), region, and quantity at `/`. They get a booking
   reference (e.g. `TKT-7F3K9Q`).
2. **Review** — the coordinator opens `/admin`, sees pending requests oldest
   first, and clicks **Allocate** to pick specific seats visually for that
   request (a click-to-select seat map, only from seats not already taken)
   or **Reject**.
3. **Pay** — once allocated, the requester goes to `/status` (ref + mobile),
   sees their seat numbers, the amount due, and an auto-generated UPI QR
   code, and has a fixed window (default 24h) to pay and paste their
   transaction/UTR details back into the portal.
4. **Confirm** — the coordinator verifies the pasted transaction details in
   `/admin` and clicks **Confirm payment**. If the window lapses with no
   payment submitted, the hold is automatically released and those seats
   become available again.

No calling the coordinator required or expected anywhere in this flow.

## Getting started

This needs a Postgres database — SQLite was dropped because it can't survive
on serverless hosts like Vercel (see **Deploying** below for why). The
easiest free option is [Neon](https://neon.tech) (also what "Vercel Postgres"
runs on).

```bash
npm install
# set DATABASE_URL in .env to your Postgres connection string first
npx prisma migrate dev --name init   # creates tables
npx prisma db seed                    # seeds categories/regions/seats
npm run dev
```

Visit `http://localhost:3000` for the request form, `http://localhost:3000/admin`
for the coordinator dashboard.

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `ADMIN_PASSWORD` | Coordinator login password for `/admin`. **Change before going live.** |
| `SESSION_SECRET` | Signs the admin session cookie and authorizes the cron endpoint. **Change before going live.** |
| `UPI_ID` | Your UPI ID (e.g. `name@okhdfcbank`) — payment QR codes are generated against this. |
| `UPI_PAYEE_NAME` | Display name shown to payers in their UPI app. |
| `BOOKING_HOLD_HOURS` | Hours a blocked booking stays reserved before auto-expiring (default `24`). |

Ticket categories (Class A/B/C: price + seats) and regions ship with
placeholder values (seeded in `prisma/seed.ts`) and are fully editable from
`/admin` — no redeploy needed to change prices, add seats, or edit regions.

## Deploying to Vercel

1. **Create a Postgres database.** In your Vercel project → **Storage** tab →
   **Create Database** → Postgres (this provisions a Neon database and can
   auto-link its connection string to your project). Or create one directly
   at [neon.tech](https://neon.tech) and add it manually.
2. **Set environment variables** in Vercel project settings (Production, and
   Preview if you want preview deploys to work): `DATABASE_URL`,
   `ADMIN_PASSWORD`, `SESSION_SECRET`, `UPI_ID`, `UPI_PAYEE_NAME`,
   `BOOKING_HOLD_HOURS`. If Vercel auto-linked the database, `DATABASE_URL`
   is already set for you.
3. **Run the first migration + seed once**, from your machine, pointed at
   that same `DATABASE_URL` (Vercel's build step runs `prisma migrate
   deploy` automatically on every deploy, but only seeds if the DB has data
   — `prisma db seed` is a one-time manual step):
   ```bash
   DATABASE_URL="<paste production connection string>" npx prisma migrate deploy
   DATABASE_URL="<paste production connection string>" npx prisma db seed
   ```
4. **Deploy** — push to the branch Vercel is watching, or `vercel deploy`.

Why SQLite didn't work there: Vercel's serverless functions run on an
ephemeral, mostly read-only filesystem, and each request can hit a different
container — a file-based database can't be written to persistently or shared
across requests in that model. Postgres (a real network database) is the fix,
not a workaround.

## Notes

- Seats are tracked per category (not per region); a seat is unavailable
  the moment it's assigned to a booking that's `ALLOCATED`,
  `PAYMENT_SUBMITTED`, or `CONFIRMED`, and freed again on `REJECTED`/`EXPIRED`.
- Expired/unpaid holds are swept lazily whenever a relevant page loads. For a
  more prompt sweep with no visitors, hit `POST /api/cron/expire` with
  `Authorization: Bearer <SESSION_SECRET>` from an external cron/uptime
  pinger — optional, not required for correctness.
