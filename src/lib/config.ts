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
  // Anyone who visits `/?preview=<this value>` gets early access to the
  // booking form before BOOKING_OPENS_AT (a cookie is set so the link only
  // needs to be opened once). Leave unset to disable preview access entirely.
  previewSecret: process.env.PREVIEW_SECRET ?? "",
};

// Cookie that marks a browser as having used a valid preview link.
export const PREVIEW_COOKIE = "booking_preview";

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

// True if this cookie value came from a valid preview link.
export function hasPreviewAccess(cookieValue: string | undefined): boolean {
  return (
    !!config.previewSecret &&
    cookieValue === config.previewSecret
  );
}

// Booking is available to this request if it has opened for everyone, or if
// the browser holds a valid preview cookie.
export function isBookingAvailable(previewCookieValue: string | undefined): boolean {
  return isBookingOpen() || hasPreviewAccess(previewCookieValue);
}
