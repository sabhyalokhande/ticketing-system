"use client";

import { deallocateBooking } from "@/app/admin/actions";

// Confirmation-guarded so a stray click doesn't wipe a hand-picked seat
// assignment. The freed seat numbers are shown in the confirmation notice
// afterwards, so an accidental deallocate can be undone by re-picking them.
export function DeallocateButton({
  bookingId,
  bookingRef,
}: {
  bookingId: string;
  bookingRef: string;
}) {
  return (
    <form
      action={deallocateBooking.bind(null, bookingId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Deallocate ${bookingRef}? Its seats are freed and the request goes back to Pending for you to re-allocate.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="btn-secondary"
        title="Free these seats and send the request back to Pending so you can allocate different seats"
      >
        Deallocate
      </button>
    </form>
  );
}
