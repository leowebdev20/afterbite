import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user" }
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: { timeZone: "Europe/Berlin", reminderTimes: ["09:00", "20:00"] },
    create: {
      userId: user.id,
      timeZone: "Europe/Berlin",
      reminderTimes: ["09:00", "20:00"],
      age: 30,
      heightCm: 175,
      weightKg: 70,
      caloriesGoal: 2000
    }
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
