import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function expand(start: number, end: number): number[] {
  const out: number[] = [];
  for (let n = start; n <= end; n++) out.push(n);
  return out;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Real seat layout for Mahakavi Kalidas Natya Mandir, digitized from the
// venue's seating chart. Some side sections of the chart were too unclear
// in the photo to digitize safely and are intentionally left out rather
// than guessed; add them later via /admin "Add seats" once confirmed.

// Rows A-G: one continuous seat run each (right wing -> center -> left wing).
const MA_CONTINUOUS_ROWS: Record<string, [number, number]> = {
  A: [1, 20],
  B: [1, 35],
  C: [1, 40],
  D: [1, 42],
  E: [1, 45],
  F: [1, 48],
  G: [1, 51],
};
// Rows H-O: split into a left block and a right block around the center aisle.
const MA_SPLIT_ROWS: Record<string, [number, number]> = {
  HL: [20, 40],
  HR: [17, 28],
  IL: [31, 44],
  IR: [18, 30],
  JL: [32, 44],
  JR: [19, 31],
  KL: [33, 45],
  KR: [20, 32],
  LL: [35, 48],
  LR: [21, 34],
  ML: [35, 48],
  MR: [21, 34],
  NL: [17, 28],
  NR: [5, 16],
};
const MA_SINGLE_ROWS: Record<string, [number, number]> = { O: [12, 22] };

// Marked "Reserved Seat" on the chart - excluded, not sellable.
const MA_RESERVED = new Set([
  "A-01",
  "A-02",
  "A-03",
  "A-04",
  "B-25",
  "B-26",
  "B-27",
  "B-28",
  "C-30",
  "C-31",
  "LR-21",
  "LR-22",
  "LR-23",
  "LR-24",
  "LR-25",
]);

function buildMainAuditoriumSeats(): string[] {
  const labels: string[] = [];
  for (const [row, [start, end]] of Object.entries(MA_CONTINUOUS_ROWS)) {
    for (const n of expand(start, end)) labels.push(`${row}-${pad(n)}`);
  }
  for (const [row, [start, end]] of Object.entries(MA_SPLIT_ROWS)) {
    for (const n of expand(start, end)) labels.push(`${row}-${pad(n)}`);
  }
  for (const [row, [start, end]] of Object.entries(MA_SINGLE_ROWS)) {
    for (const n of expand(start, end)) labels.push(`${row}-${pad(n)}`);
  }
  return labels.filter((l) => !MA_RESERVED.has(l));
}

// Balcony center block rows (C-L), independently numbered.
const BAL_CENTRAL_ROWS: Record<string, [number, number]> = {
  C: [16, 35],
  D: [25, 44],
  E: [27, 46],
  F: [27, 46],
  G: [29, 48],
  H: [30, 49],
  I: [36, 55],
  J: [10, 29],
  K: [1, 20],
  L: [1, 20],
};
// Balcony right-wing block rows (A-I) - "R" suffix so e.g. central "C-16"
// and wing "CR-01" never collide.
const BAL_RIGHT_ROWS: Record<string, [number, number]> = {
  A: [1, 2],
  B: [1, 5],
  C: [1, 12],
  D: [1, 13],
  E: [1, 13],
  F: [1, 12],
  G: [1, 12],
  H: [1, 12],
  I: [1, 35],
};

function buildBalconySeats(): string[] {
  const labels: string[] = [];
  for (const [row, [start, end]] of Object.entries(BAL_CENTRAL_ROWS)) {
    for (const n of expand(start, end)) labels.push(`${row}-${pad(n)}`);
  }
  for (const [row, [start, end]] of Object.entries(BAL_RIGHT_ROWS)) {
    for (const n of expand(start, end)) labels.push(`${row}R-${pad(n)}`);
  }
  return labels;
}

async function seedCategory(name: string, price: number, seatLabels: string[]) {
  const category = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, price },
  });
  const existing = await prisma.seat.count({ where: { categoryId: category.id } });
  if (existing === 0) {
    await prisma.seat.createMany({
      data: seatLabels.map((label) => ({ categoryId: category.id, label })),
    });
  }
}

async function main() {
  await seedCategory("Main Auditorium", 1500, buildMainAuditoriumSeats());
  await seedCategory("Balcony", 800, buildBalconySeats());

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

  console.log("Seeded categories, real venue seats, and regions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
