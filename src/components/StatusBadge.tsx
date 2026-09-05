const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ALLOCATED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PAYMENT_SUBMITTED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  EXPIRED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  ALLOCATED: "Allocated Seat",
  PAYMENT_SUBMITTED: "Payment submitted",
  CONFIRMED: "Blocked Seat – payment confirmed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
