export const config = {
  adminPassword: process.env.ADMIN_PASSWORD ?? "changeme123",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
  upiId: process.env.UPI_ID ?? "coordinator@upi",
  upiPayeeName: process.env.UPI_PAYEE_NAME ?? "Ticketing Coordinator",
  holdHours: Number(process.env.BOOKING_HOLD_HOURS ?? "24"),
};
