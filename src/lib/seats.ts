import { prisma } from "./prisma";

/** "Class A" -> "A", "VIP Lounge" -> "L" - short prefix used in seat labels. */
export function seatPrefix(categoryName: string): string {
  const lastWord = categoryName.trim().split(/\s+/).pop() ?? categoryName;
  return lastWord[0]?.toUpperCase() ?? "S";
}

function formatLabel(categoryName: string, n: number): string {
  return `${seatPrefix(categoryName)}-${String(n).padStart(3, "0")}`;
}

/**
 * Appends `count` new seats to a category, numbered right after the seats
 * that already exist (seats are never renumbered or deleted, so this is
 * always safe to call incrementally).
 */
export async function addSeatsToCategory(categoryId: string, count: number) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  const existing = await prisma.seat.count({ where: { categoryId } });

  const seats = Array.from({ length: count }, (_, i) => ({
    categoryId,
    label: formatLabel(category.name, existing + i + 1),
  }));

  await prisma.seat.createMany({ data: seats });
  return seats.length;
}
