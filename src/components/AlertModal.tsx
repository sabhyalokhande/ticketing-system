"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

// A one-shot modal that pops when the page loads. Used on the status page to
// make sure the payer sees a message they can't scroll past.
export function AlertModal({
  icon,
  title,
  children,
  dismissLabel = "Got it",
  actionHref,
  actionLabel,
}: {
  icon: string;
  title: string;
  children: ReactNode;
  dismissLabel?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-amber-300 bg-white p-5 text-center shadow-xl dark:border-amber-500/40 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          {icon}
        </div>
        <h2 id="alert-modal-title" className="text-base font-semibold text-black dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">{children}</p>

        <div className="mt-4 flex flex-col gap-2">
          {actionHref && actionLabel && (
            <Link href={actionHref} className="btn-primary w-full">
              {actionLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={actionHref ? "btn-secondary w-full" : "btn-primary w-full"}
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
