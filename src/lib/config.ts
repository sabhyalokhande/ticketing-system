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
};
