import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { formatDateTimeIST } from "@/lib/date";
import { toCsv } from "@/lib/csv";
import { STATUS_LABELS } from "@/components/StatusBadge";

// Exports every booking, in every status, as a CSV (opens directly in
// Excel). One row per booking - the full record a coordinator would want
// for reconciliation, not just what's shown in a given dashboard queue.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      category: true,
      region: true,
      seats: { select: { label: true }, orderBy: { label: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "Ref",
    "Status",
    "Name",
    "Mobile (WhatsApp)",
    "Category",
    "Price per ticket",
    "Quantity",
    "Amount Due",
    "Residence Area",
    "Seats",
    "Requested At (IST)",
    "Allocated At (IST)",
    "Payment Deadline (IST)",
    "Payment Submitted At (IST)",
    "Transaction Details",
    "Has Payment Screenshot",
    "Confirmed At (IST)",
    "Rejected At (IST)",
    "Rejection Reason",
  ];

  const rows = bookings.map((b) => [
    b.ref,
    STATUS_LABELS[b.status] ?? b.status,
    b.name,
    b.mobile,
    b.category.name,
    b.category.price,
    b.quantity,
    b.amountDue ?? "",
    b.region.name,
    b.seats.map((s) => s.label).join(", "),
    formatDateTimeIST(b.createdAt),
    b.allocatedAt ? formatDateTimeIST(b.allocatedAt) : "",
    b.expiresAt ? formatDateTimeIST(b.expiresAt) : "",
    b.paymentSubmittedAt ? formatDateTimeIST(b.paymentSubmittedAt) : "",
    b.transactionDetails ?? "",
    b.paymentScreenshotType ? "Yes" : "No",
    b.confirmedAt ? formatDateTimeIST(b.confirmedAt) : "",
    b.rejectedAt ? formatDateTimeIST(b.rejectedAt) : "",
    b.rejectionReason ?? "",
  ]);

  const csv = toCsv(header, rows);
  const filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
