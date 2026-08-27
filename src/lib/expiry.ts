import { prisma } from "./prisma";

/**
 * Releases any ALLOCATED booking whose 24h hold has passed without payment
 * being submitted, freeing its seats back to the pool. Cheap to call on
 * every read - there's no separate worker process, so pages/actions that
 * touch bookings call this first ("lazy" expiry). Also exposed via
 * /api/cron/expire for an external pinger.
 */
export async function expireStaleBookings(): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: { status: "ALLOCATED", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;

  const ids = stale.map((b) => b.id);
  await prisma.$transaction([
    prisma.seat.updateMany({ where: { bookingId: { in: ids } }, data: { bookingId: null } }),
    prisma.booking.updateMany({ where: { id: { in: ids } }, data: { status: "EXPIRED" } }),
  ]);
  return ids.length;
}
