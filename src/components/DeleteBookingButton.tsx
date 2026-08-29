"use client";

import { deleteBooking } from "@/app/admin/actions";

export function DeleteBookingButton({ bookingId, bookingRef }: { bookingId: string; bookingRef: string }) {
  return (
    <form
      action={deleteBooking.bind(null, bookingId)}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete ${bookingRef}? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn-danger">
        Delete
      </button>
    </form>
  );
}
