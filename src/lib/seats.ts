import { prisma } from "./prisma";

/**
 * Appends `count` new seats to a category, beyond its official row layout.
 * Labeled "X-01", "X-02", ... (an "extra" row) so they can never collide
 * with a real theatre row letter, and continues from the highest existing
 * X-row number if called more than once.
 */
export async function addSeatsToCategory(categoryId: string, count: number) {
  const seats = await prisma.seat.findMany({ where: { categoryId }, select: { label: true } });
  const highest = seats.reduce((max, s) => {
    const m = /^X-(\d+)$/.exec(s.label);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const newSeats = Array.from({ length: count }, (_, i) => ({
    categoryId,
    label: `X-${String(highest + i + 1).padStart(2, "0")}`,
  }));

  await prisma.seat.createMany({ data: newSeats });
  return newSeats.length;
}
