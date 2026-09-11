import { prisma } from "./prisma";

// Categories that don't own a seat block. A booking in one of these is priced
// at its own category's rate, but the coordinator allocates it a real seat
// from another category's pool (e.g. a Donor's Pass holder sits in the main
// auditorium).
const SEAT_POOL_SOURCE: Record<string, string> = {
  "Donor's Pass": "Auditorium level",
};

// Row letter (inclusive) a borrowing category is allowed to draw seats up
// to, keyed by the borrowing category's name. Donor's Pass draws from the
// full Auditorium level pool, but a donor's pass only entitles its holder to
// a seat in rows A-G (the "donors section") - left unrestricted, coordinators
// have mistakenly allocated donors a seat further back in the auditorium.
const SEAT_POOL_ROW_LIMIT: Record<string, string> = {
  "Donor's Pass": "G",
};

/** Name of the category whose seats a booking in `categoryName` draws from. */
export function seatPoolCategoryName(categoryName: string): string {
  return SEAT_POOL_SOURCE[categoryName] ?? categoryName;
}

/** True when `categoryName` has no seats of its own and borrows from another pool. */
export function borrowsSeats(categoryName: string): boolean {
  return categoryName in SEAT_POOL_SOURCE;
}

/** Row letter a booking in `categoryName` is restricted to, if any (e.g. "G"). */
export function seatPoolRowLimit(categoryName: string): string | undefined {
  return SEAT_POOL_ROW_LIMIT[categoryName];
}

/** Row letter parsed from a seat label like "G-014" (the part before "-"). */
function seatRow(label: string): string {
  return label.split("-")[0];
}

/**
 * True when `label` is within the row range a booking in `categoryName` is
 * allowed to draw from. Categories with no configured limit (including ones
 * that don't borrow seats at all) allow every seat in their pool.
 */
export function seatWithinPoolLimit(label: string, categoryName: string): boolean {
  const limit = SEAT_POOL_ROW_LIMIT[categoryName];
  if (!limit) return true;
  return seatRow(label) <= limit;
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
