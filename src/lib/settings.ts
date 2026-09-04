import { prisma } from "./prisma";
import { config } from "./config";

export type HoldMode = "hours" | "end-of-next-day";

export interface PaymentWindow {
  holdMode: HoldMode;
  holdHours: number;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Current payment-window settings, falling back to the env default. */
export async function getPaymentWindow(): Promise<PaymentWindow> {
  const row = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    holdMode: row?.holdMode === "end-of-next-day" ? "end-of-next-day" : "hours",
    holdHours: row?.holdHours ?? config.holdHours,
  };
}

export async function setPaymentWindow(data: PaymentWindow) {
  return prisma.setting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

/**
 * The payment deadline for a booking allocated at `from`.
 *  - "hours": `from` + holdHours.
 *  - "end-of-next-day": midnight (IST) at the end of the day after `from`'s
 *    IST date - i.e. the booker always gets the rest of today plus all of
 *    tomorrow, regardless of what time they were allocated.
 */
export function computeExpiry(from: Date, w: PaymentWindow): Date {
  if (w.holdMode === "end-of-next-day") {
    const ist = new Date(from.getTime() + IST_OFFSET_MS);
    const istMidnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
    return new Date(istMidnight + 2 * 24 * 60 * 60 * 1000 - IST_OFFSET_MS);
  }
  return new Date(from.getTime() + w.holdHours * 60 * 60 * 1000);
}
