"use client";

import { useMemo, useState, useTransition } from "react";
import { allocateBookingWithSeats } from "@/app/admin/actions";

type Seat = { id: string; label: string; available: boolean };

export function SeatPicker({
  bookingId,
  quantity,
  seats,
}: {
  bookingId: string;
  quantity: number;
  seats: Seat[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableCount = useMemo(() => seats.filter((s) => s.available).length, [seats]);
  const full = selected.size >= quantity;

  function toggle(seat: Seat) {
    if (!seat.available || isPending) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else if (next.size < quantity) {
        next.add(seat.id);
      }
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await allocateBookingWithSeats(bookingId, Array.from(selected));
      // On success the action redirects and this line never runs.
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-black/60 dark:text-white/60">
        <Legend swatch="border border-black/20 dark:border-white/30" label="Available" />
        <Legend swatch="bg-black dark:bg-white" label="Selected" />
        <Legend swatch="bg-black/10 dark:bg-white/10" label="Taken" />
        <span className="ml-auto">{availableCount} available</span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(4.25rem, 1fr))" }}
      >
        {seats.map((seat) => {
          const isSelected = selected.has(seat.id);
          return (
            <button
              key={seat.id}
              type="button"
              disabled={!seat.available || (!isSelected && full)}
              onClick={() => toggle(seat)}
              title={seat.available ? seat.label : `${seat.label} - already taken`}
              className={[
                "rounded-md px-2 py-2 text-xs font-mono transition-colors",
                !seat.available
                  ? "cursor-not-allowed bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30"
                  : isSelected
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : full
                      ? "cursor-not-allowed border border-black/20 text-black/40 dark:border-white/20 dark:text-white/40"
                      : "border border-black/20 hover:border-black/50 dark:border-white/30 dark:hover:border-white/60",
              ].join(" ")}
            >
              {seat.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-black/10 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/15 dark:bg-black/80">
        <span className="text-sm font-medium">
          Selected {selected.size} / {quantity}
        </span>
        <button
          type="button"
          className="btn-primary ml-auto"
          disabled={selected.size !== quantity || isPending}
          onClick={submit}
        >
          {isPending ? "Allocating…" : "Confirm allocation"}
        </button>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${swatch}`} />
      {label}
    </span>
  );
}
