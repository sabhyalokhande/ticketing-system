// All dates are displayed in India Standard Time, regardless of what
// timezone the server process itself runs in (Vercel's serverless
// functions default to UTC, which silently shows every date/time 5.5
// hours off from what a coordinator in India expects - always format
// through these instead of calling toLocaleString()/toLocaleDateString()
// directly on a Date).
const IST_TIMEZONE = "Asia/Kolkata";

export function formatDateTimeIST(date: Date): string {
  return date.toLocaleString("en-US", { timeZone: IST_TIMEZONE });
}

export function formatDateIST(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: IST_TIMEZONE });
}
