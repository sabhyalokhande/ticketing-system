import { prisma } from "./prisma";

/**
 * Appends `count` new seats to a category, numbered serially right after
 * the highest plain-numeric seat label that already exists (ignores any
 * older non-numeric labels from a previous layout scheme, if present).
 */
export async function addSeatsToCategory(categoryId: string, count: number) {
  const seats = await prisma.seat.findMany({ where: { categoryId }, select: { label: true } });
  const highest = seats.reduce((max, s) => {
    const n = /^\d+$/.test(s.label) ? Number(s.label) : 0;
    return Math.max(max, n);
  }, 0);

  const newSeats = Array.from({ length: count }, (_, i) => ({
    categoryId,
    label: String(highest + i + 1).padStart(3, "0"),
  }));

  await prisma.seat.createMany({ data: newSeats });
  return newSeats.length;
}
