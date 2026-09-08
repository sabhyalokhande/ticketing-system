"use client";

import { recoverExpiredBooking } from "@/app/admin/actions";

// Confirmation-guarded, same pattern as DeallocateButton. Sends an EXPIRED
// booking back to Pending so the coordinator can allocate it again - the
// original seats aren't restored since they may already be given out.
export function RecoverBookingButton({
  bookingId,
  bookingRef,
}: {
  bookingId: string;
  bookingRef: string;
}) {
  return (
    <form
      action={recoverExpiredBooking.bind(null, bookingId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Recover ${bookingRef}? It goes back to Pending so you can allocate seats and send a fresh payment link. Its original seats aren't restored - they may already be given out.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="btn-secondary"
        title="Send this expired request back to Pending so you can allocate it again"
      >
        Recover
      </button>
    </form>
  );
}
