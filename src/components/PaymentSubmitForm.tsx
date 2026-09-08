"use client";

import { useState } from "react";
import { submitPayment } from "@/app/actions";

// Wraps the payment-details form so the submit button stays disabled until a
// real (non-whitespace) transaction ID has been typed - `required` alone lets
// a space-only value through client-side, and we don't want anyone reaching
// the server round-trip just to be bounced back with an error.
export function PaymentSubmitForm({ bookingRef, mobile }: { bookingRef: string; mobile: string }) {
  const [transactionDetails, setTransactionDetails] = useState("");
  const isValid = transactionDetails.trim().length >= 3;

  return (
    <form action={submitPayment} className="flex flex-col gap-3">
      <input type="hidden" name="ref" value={bookingRef} />
      <input type="hidden" name="mobile" value={mobile} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Transaction ID / UTR number{" "}
        <span className="font-normal text-red-600 dark:text-red-400">(compulsory)</span>
        <textarea
          name="transactionDetails"
          required
          minLength={3}
          maxLength={500}
          rows={3}
          value={transactionDetails}
          onChange={(e) => setTransactionDetails(e.target.value)}
          placeholder="Paste your UPI transaction ID / reference number here after paying"
          className="input"
        />
        {transactionDetails.length > 0 && !isValid && (
          <span className="text-xs font-normal text-red-600 dark:text-red-400">
            Enter your actual transaction ID / UTR number &mdash; this can&apos;t be left blank.
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Payment screenshot (optional)
        <input
          name="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="input file:mr-3 file:rounded file:border-0 file:bg-black/10 file:px-2 file:py-1 file:text-xs dark:file:bg-white/10"
        />
      </label>
      <button
        type="submit"
        disabled={!isValid}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit payment details
      </button>
    </form>
  );
}
