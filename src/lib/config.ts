export const config = {
  adminPassword: process.env.ADMIN_PASSWORD ?? "changeme123",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
  upiId: process.env.UPI_ID ?? "coordinator@upi",
  upiPayeeName: process.env.UPI_PAYEE_NAME ?? "Ticketing Coordinator",
  holdHours: Number(process.env.BOOKING_HOLD_HOURS ?? "24"),
  // Shown alongside the QR code for anyone who'd rather pay by bank
  // transfer (NEFT/RTGS/IMPS) than scan.
  bankName: process.env.BANK_NAME ?? "",
  bankLocation: process.env.BANK_LOCATION ?? "",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
  bankIfsc: process.env.BANK_IFSC ?? "",
  // Secret path segment for the private preview URL: /preview/<this value>
  // shows the full booking page before BOOKING_OPENS_AT. The public root URL
  // is never affected. Leave unset to disable the preview URL entirely.
  previewSecret: process.env.PREVIEW_SECRET ?? "",
};

// The public request form is gated until this instant (5th September
// 2026, 9:00 AM IST = 03:30 UTC the same day). Stored as a fixed UTC
// instant rather than separate date/time strings so the comparison is
// correct regardless of the server's own timezone (see the IST-display
// bug this app hit earlier - comparisons on Date objects are timezone-safe
// the same way, but only if the instant itself is built correctly once).
export const BOOKING_OPENS_AT = new Date("2026-09-05T03:30:00.000Z");

export function isBookingOpen(): boolean {
  return new Date() >= BOOKING_OPENS_AT;
}

// True when `code` matches the configured preview secret (and a secret is set).
export function isValidPreviewCode(code: string | undefined | null): boolean {
  return !!config.previewSecret && code === config.previewSecret;
}
