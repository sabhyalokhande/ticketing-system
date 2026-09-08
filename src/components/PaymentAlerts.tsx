"use client";

import { useEffect, useState, type ReactNode } from "react";

type Step = {
  icon: string;
  title: string;
  body: ReactNode;
  dismissLabel?: string;
};

// Shows one alert at a time, in order - dismissing one reveals the next.
// Used on the payment step of the status page so payers can't miss either
// message by only seeing whichever modal happens to mount first.
export function PaymentAlerts({ steps }: { steps: Step[] }) {
  const [index, setIndex] = useState(0);
  const advance = () => setIndex((i) => i + 1);
  const open = index < steps.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && advance();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const step = steps[index];

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={advance}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-amber-300 bg-white p-5 text-center shadow-xl dark:border-amber-500/40 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          {step.icon}
        </div>
        <h2 id="payment-alert-title" className="text-base font-semibold text-black dark:text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">{step.body}</p>

        <button type="button" onClick={advance} className="btn-primary mt-4 w-full">
          {step.dismissLabel ?? "Got it"}
        </button>
      </div>
    </div>
  );
}
