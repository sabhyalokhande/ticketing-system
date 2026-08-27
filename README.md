# Ticketing Portal

A small portal for handling ticket requests on a first-come-first-served basis,
without the coordinator ever picking up a phone.

## How it works

1. **Request** — a requester fills in name, mobile number, ticket category
   (Class A / B / C), region, and quantity at `/`. They get a booking
   reference (e.g. `TKT-7F3K9Q`).
2. **Review** — the coordinator opens `/admin`, sees pending requests oldest
   first, and clicks **Allocate** to block tickets (only if enough inventory
   remains) or **Reject**.
3. **Pay** — once allocated, the requester goes to `/status` (ref + mobile),
   sees the amount due and an auto-generated UPI QR code, and has a fixed
   window (default 24h) to pay and paste their transaction/UTR details back
   into the portal.
4. **Confirm** — the coordinator verifies the pasted transaction details in
   `/admin` and clicks **Confirm payment**. If the window lapses with no
   payment submitted, the hold is automatically released back into
   inventory.

No calling the coordinator required or expected anywhere in this flow.

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and seeds categories/regions
npm run dev
```

Visit `http://localhost:3000` for the request form, `http://localhost:3000/admin`
for the coordinator dashboard.

## Configuration

Copy `.env.example` to `.env` (already done for local dev) and set:

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Coordinator login password for `/admin`. **Change before going live.** |
| `SESSION_SECRET` | Signs the admin session cookie and authorizes the cron endpoint. **Change before going live.** |
| `UPI_ID` | Your UPI ID (e.g. `name@okhdfcbank`) — payment QR codes are generated against this. |
| `UPI_PAYEE_NAME` | Display name shown to payers in their UPI app. |
| `BOOKING_HOLD_HOURS` | Hours a blocked booking stays reserved before auto-expiring (default `24`). |

Ticket categories (Class A/B/C: price + total inventory) and regions ship
with placeholder values (seeded in `prisma/seed.ts`) and are fully editable
from `/admin` — no redeploy needed to change prices, inventory, or the list
of regions.

## Notes

- Inventory is tracked per category only (not per region); a booking counts
  against its category's inventory the moment it's `ALLOCATED`,
  `PAYMENT_SUBMITTED`, or `CONFIRMED`.
- Expired/unpaid holds are swept lazily whenever a relevant page loads. For a
  more prompt sweep with no visitors, hit `POST /api/cron/expire` with
  `Authorization: Bearer <SESSION_SECRET>` from an external cron/uptime
  pinger — optional, not required for correctness.
- Uses SQLite (`dev.db`) for simplicity. For real concurrent production
  traffic, swap `DATABASE_URL`/the Prisma datasource for Postgres.
