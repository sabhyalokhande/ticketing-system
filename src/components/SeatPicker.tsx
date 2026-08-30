"use client";

import { useMemo, useState, useTransition } from "react";
import { allocateBookingWithSeats } from "@/app/admin/actions";

type Seat = { id: string; label: string; available: boolean };

// A seat label is "<row>-<seatNumber>", e.g. "G-51" (row "G", seat 51).
function rowOf(label: string): string {
  const i = label.lastIndexOf("-");
  return i === -1 ? label : label.slice(0, i);
}

/** Groups a flat, label-sorted seat list into one entry per row, in the order rows first appear. */
function groupByRow(seats: Seat[]): { row: string; seats: Seat[] }[] {
  const byRow = new Map<string, Seat[]>();
  const order: string[] = [];
  for (const seat of seats) {
    const row = rowOf(seat.label);
    if (!byRow.has(row)) {
      byRow.set(row, []);
      order.push(row);
    }
    byRow.get(row)!.push(seat);
  }
  return order.map((row) => ({ row, seats: byRow.get(row)! }));
}

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
  // Row "A" (front of house) first in the data - reverse so it renders
  // closest to the STAGE label at the bottom, like the real venue.
  const rows = useMemo(() => groupByRow(seats).reverse(), [seats]);
  const full = selected.size >= quantity;

  // Every row centers within one shared width (the widest row's), so rows
  // of different lengths align on a common axis instead of each drifting
  // to its own center.
  const BUTTON_PX = 32; // seat button + its gap
  const LABEL_PX = 32;
  const maxRowSeats = Math.max(1, ...rows.map((r) => r.seats.length));
  const rowsWidthPx = Math.ceil(LABEL_PX + maxRowSeats * BUTTON_PX + 24);

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

  function seatButton(seat: Seat) {
    const isSelected = selected.has(seat.id);
    const num = seat.label.slice(seat.label.lastIndexOf("-") + 1);
    return (
      <button
        key={seat.id}
        type="button"
        disabled={!seat.available || (!isSelected && full)}
        onClick={() => toggle(seat)}
        title={seat.available ? seat.label : `${seat.label} - already taken`}
        className={[
          "h-7 w-7 shrink-0 rounded text-[10px] font-mono transition-colors",
          !seat.available
            ? "cursor-not-allowed bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30"
            : isSelected
              ? "bg-black text-white dark:bg-white dark:text-black"
              : full
                ? "cursor-not-allowed border border-black/20 text-black/40 dark:border-white/20 dark:text-white/40"
                : "border border-black/20 hover:border-black/50 dark:border-white/30 dark:hover:border-white/60",
        ].join(" ")}
      >
        {num}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-black/60 dark:text-white/60">
        <Legend swatch="border border-black/20 dark:border-white/30" label="Available" />
        <Legend swatch="bg-black dark:bg-white" label="Selected" />
        <Legend swatch="bg-black/10 dark:bg-white/10" label="Taken" />
        <span className="ml-auto">{availableCount} available</span>
      </div>

      <div className="flex rounded-lg border border-black/10 p-4 dark:border-white/15">
        {/* Row labels - a separate, non-scrolling column so they never get
            hidden or overlapped by seats scrolling underneath. */}
        <div className="flex shrink-0 flex-col gap-1.5 pr-2">
          {rows.map((r) => (
            <div
              key={r.row}
              className="flex h-7 w-6 items-center justify-end font-mono text-[10px] text-black/40 dark:text-white/40"
            >
              {r.row}
            </div>
          ))}
          <div className="h-7" /> {/* aligns with the STAGE bar below */}
        </div>

        {/* Seats - scrolls horizontally on its own; rows share one fixed
            width so they all center on the same axis, matching the real
            fan/curve shape of the auditorium. */}
        <div className="overflow-x-auto">
          <div className="mx-auto flex flex-col gap-1.5" style={{ width: rowsWidthPx }}>
            {rows.map((r) => (
              <div key={r.row} className="flex h-7 items-center justify-center gap-1">
                {r.seats.map(seatButton)}
              </div>
            ))}

            <div className="mt-3 rounded-md bg-black/5 py-1.5 text-center text-xs font-medium tracking-widest text-black/40 dark:bg-white/10 dark:text-white/40">
              STAGE
            </div>
          </div>
        </div>
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
