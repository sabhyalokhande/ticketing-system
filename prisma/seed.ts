import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Real per-row seat counts for Mahakavi Kalidas Natya Mandir, from the
// venue's official row/seat count sheet.
const MAIN_AUDITORIUM_ROWS: Record<string, number> = {
  A: 20,
  B: 35,
  C: 39,
  D: 42,
  E: 45,
  F: 48,
  G: 51,
  H: 56,
  I: 60,
  J: 62,
  K: 64,
  L: 68,
  M: 68,
  N: 32,
  O: 22,
}; // 712 total

const BALCONY_ROWS: Record<string, number> = {
  A: 4,
  B: 10,
  C: 50,
  D: 68,
  E: 72,
  F: 73,
  G: 76,
  H: 78,
  I: 91,
  J: 39,
  K: 20,
  L: 20,
}; // 601 total

function buildRowWiseLabels(rows: Record<string, number>): string[] {
  const labels: string[] = [];
  for (const [row, count] of Object.entries(rows)) {
    for (let n = 1; n <= count; n++) labels.push(`${row}-${pad(n)}`);
  }
  return labels;
}

async function seedCategory(name: string, price: number, rows: Record<string, number>) {
  const category = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, price },
  });
  const existing = await prisma.seat.count({ where: { categoryId: category.id } });
  if (existing === 0) {
    await prisma.seat.createMany({
      data: buildRowWiseLabels(rows).map((label) => ({ categoryId: category.id, label })),
    });
  }
}

async function main() {
  await seedCategory("Auditorium level", 1500, MAIN_AUDITORIUM_ROWS);
  await seedCategory("Balcony", 800, BALCONY_ROWS);

  const regions = [
    "Western (Virar to Churchgate)",
    "Dombivli, Kalyan, Khopoli",
    "Bhandup to Dadar incl Chembur",
    "New Mumbai (Airoli to Panvel)",
    "Kalwa",
    "Mulund",
    "Thane",
    "Others",
  ];
  for (const name of regions) {
    await prisma.region.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeded categories, row-wise seats, and regions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
