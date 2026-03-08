import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user" }
  });

  const ingredients = [
    "Wheat Flour",
    "Tomato",
    "Mozzarella",
    "Olive Oil",
    "Rice",
    "Eggs",
    "Milk",
    "Yogurt",
    "Chicken",
    "Spinach"
  ];

  await prisma.ingredient.createMany({
    data: ingredients.map((name) => ({ name })),
    skipDuplicates: true
  });

  console.log(`Seeded demo user ${user.id} and ${ingredients.length} ingredients.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
