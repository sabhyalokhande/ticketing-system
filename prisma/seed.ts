import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function seatPrefix(categoryName: string): string {
  const lastWord = categoryName.trim().split(/\s+/).pop() ?? categoryName;
  return lastWord[0]?.toUpperCase() ?? "S";
}

async function main() {
  // Mahakavi Kalidas Natya Mandir seating - see the venue's seating chart.
  // TODO: seat counts here are placeholders pending final confirmed numbers
  // (chart shows 712 main / 60 balcony; adjust once confirmed).
  const categories = [
    { name: "Main Auditorium", price: 1500, seatCount: 100 },
    { name: "Balcony", price: 800, seatCount: 150 },
  ];

  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, price: c.price },
    });

    const existingSeats = await prisma.seat.count({ where: { categoryId: category.id } });
    if (existingSeats === 0) {
      const prefix = seatPrefix(c.name);
      await prisma.seat.createMany({
        data: Array.from({ length: c.seatCount }, (_, i) => ({
          categoryId: category.id,
          label: `${prefix}-${String(i + 1).padStart(3, "0")}`,
        })),
      });
    }
  }

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

  console.log(
    "Seeded categories, seats, and regions (edit prices/regions/add seats any time in /admin)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
