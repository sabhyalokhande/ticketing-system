import { prisma } from "./prisma";

// Categories that don't own a seat block. A booking in one of these is priced
// at its own category's rate, but the coordinator allocates it a real seat
// from another category's pool (e.g. a Donor's Pass holder sits in the main
// auditorium).
const SEAT_POOL_SOURCE: Record<string, string> = {
  "Donor's Pass": "Auditorium level",
};

/** Name of the category whose seats a booking in `categoryName` draws from. */
export function seatPoolCategoryName(categoryName: string): string {
  return SEAT_POOL_SOURCE[categoryName] ?? categoryName;
}

/** True when `categoryName` has no seats of its own and borrows from another pool. */
export function borrowsSeats(categoryName: string): boolean {
  return categoryName in SEAT_POOL_SOURCE;
}

/**
 * The category id to allocate seats from for a given booking - its own
 * category normally, or the pool it borrows from (falling back to its own
 * category if that pool can't be found).
 */
export async function resolveSeatCategoryId(booking: {
  categoryId: string;
  category: { name: string };
}): Promise<string> {
  const poolName = seatPoolCategoryName(booking.category.name);
  if (poolName === booking.category.name) return booking.categoryId;

  const pool = await prisma.category.findUnique({
    where: { name: poolName },
    select: { id: true },
  });
  return pool?.id ?? booking.categoryId;
}
