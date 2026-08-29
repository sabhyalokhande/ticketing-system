import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCategory(name: string, price: number, seatCount: number) {
  const category = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, price },
  });
  const existing = await prisma.seat.count({ where: { categoryId: category.id } });
  if (existing === 0) {
    await prisma.seat.createMany({
      data: Array.from({ length: seatCount }, (_, i) => ({
        categoryId: category.id,
        label: String(i + 1).padStart(3, "0"),
      })),
    });
  }
}

async function main() {
  // Mahakavi Kalidas Natya Mandir - seats numbered serially per section
  // rather than matching the physical chart's row layout.
  await seedCategory("Main Auditorium", 1500, 657);
  await seedCategory("Balcony", 800, 601);

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

  console.log("Seeded categories, seats, and regions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
