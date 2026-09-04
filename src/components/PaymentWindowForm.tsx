"use client";

import { useState } from "react";
import { updatePaymentWindow } from "@/app/admin/actions";
import type { HoldMode } from "@/lib/settings";

export function PaymentWindowForm({
  holdMode,
  holdHours,
}: {
  holdMode: HoldMode;
  holdHours: number;
}) {
  const [mode, setMode] = useState<HoldMode>(holdMode);

  return (
    <form action={updatePaymentWindow} className="flex flex-col gap-3 text-sm">
      <label className="flex items-start gap-2">
        <input
          type="radio"
          name="holdMode"
          value="hours"
          checked={mode === "hours"}
          onChange={() => setMode("hours")}
          className="mt-1"
        />
        <span className="flex flex-wrap items-center gap-2">
          Fixed window of
          <input
            name="holdHours"
            type="number"
            min={1}
            max={720}
            defaultValue={holdHours}
            disabled={mode !== "hours"}
            className="input w-20 disabled:opacity-50"
          />
          hour(s) from when the tickets are blocked
        </span>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="radio"
          name="holdMode"
          value="end-of-next-day"
          checked={mode === "end-of-next-day"}
          onChange={() => setMode("end-of-next-day")}
          className="mt-1"
        />
        <span>
          Until the <strong>end of the next day</strong> &mdash; a booking blocked at 2pm today
          stays valid all through tomorrow (expires at midnight IST).
        </span>
      </label>

      <button type="submit" className="btn-secondary self-start">
        Save payment window
      </button>
    </form>
  );
}
