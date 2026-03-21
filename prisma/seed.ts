import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYMPTOMS = [
  "bloating",
  "stomachPain",
  "inflammation",
  "fatigue",
  "brainFog",
  "headache",
  "digestionQuality",
  "mood",
  "energy"
] as const;

function atLocal(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user" }
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      timeZone: "Europe/Berlin",
      reminderTimes: ["09:00", "20:00"],
      age: 30,
      heightCm: 175,
      weightKg: 70,
      caloriesGoal: 2000
    },
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
    "Spinach",
    "Salmon",
    "Avocado",
    "Oats",
    "Blueberries",
    "Banana",
    "Almonds"
  ];

  await prisma.ingredient.createMany({
    data: ingredients.map((name) => ({ name })),
    skipDuplicates: true
  });

  const ingredientRows = await prisma.ingredient.findMany({
    where: { name: { in: ingredients } }
  });
  const ingredientIdByName = new Map(ingredientRows.map((ingredient) => [ingredient.name, ingredient.id]));

  await prisma.ingredientImpactSnapshot.deleteMany({ where: { userId: user.id } });
  await prisma.recipe.deleteMany({ where: { userId: user.id } });
  await prisma.meal.deleteMany({ where: { userId: user.id } });
  await prisma.symptomLog.deleteMany({ where: { userId: user.id } });

  const meals = [
    {
      name: "Overnight oats",
      mealType: "BREAKFAST" as const,
      daysAgo: 6,
      hour: 8,
      minute: 20,
      ingredients: [
        { name: "Oats", quantity: 80 },
        { name: "Milk", quantity: 180 },
        { name: "Banana", quantity: 100 }
      ]
    },
    {
      name: "Chicken rice bowl",
      mealType: "LUNCH" as const,
      daysAgo: 6,
      hour: 13,
      minute: 5,
      ingredients: [
        { name: "Chicken", quantity: 140 },
        { name: "Rice", quantity: 120 },
        { name: "Olive Oil", quantity: 10 }
      ]
    },
    {
      name: "Greek yogurt snack",
      mealType: "SNACK" as const,
      daysAgo: 5,
      hour: 10,
      minute: 15,
      ingredients: [
        { name: "Yogurt", quantity: 160 },
        { name: "Blueberries", quantity: 40 },
        { name: "Almonds", quantity: 20 }
      ]
    },
    {
      name: "Pasta dinner",
      mealType: "DINNER" as const,
      daysAgo: 5,
      hour: 20,
      minute: 30,
      ingredients: [
        { name: "Wheat Flour", quantity: 120 },
        { name: "Tomato", quantity: 80 },
        { name: "Olive Oil", quantity: 12 }
      ]
    },
    {
      name: "Avocado toast",
      mealType: "BREAKFAST" as const,
      daysAgo: 4,
      hour: 8,
      minute: 10,
      ingredients: [
        { name: "Wheat Flour", quantity: 70 },
        { name: "Avocado", quantity: 60 },
        { name: "Eggs", quantity: 50 }
      ]
    },
    {
      name: "Salmon with spinach",
      mealType: "DINNER" as const,
      daysAgo: 4,
      hour: 19,
      minute: 20,
      ingredients: [
        { name: "Salmon", quantity: 150 },
        { name: "Spinach", quantity: 90 },
        { name: "Olive Oil", quantity: 10 }
      ]
    },
    {
      name: "Chicken parm",
      mealType: "LUNCH" as const,
      daysAgo: 3,
      hour: 13,
      minute: 12,
      ingredients: [
        { name: "Chicken", quantity: 150 },
        { name: "Tomato", quantity: 70 },
        { name: "Mozzarella", quantity: 60 }
      ]
    },
    {
      name: "Rice eggs bowl",
      mealType: "LUNCH" as const,
      daysAgo: 2,
      hour: 12,
      minute: 50,
      ingredients: [
        { name: "Rice", quantity: 130 },
        { name: "Eggs", quantity: 55 },
        { name: "Spinach", quantity: 80 }
      ]
    },
    {
      name: "Pizza night",
      mealType: "DINNER" as const,
      daysAgo: 1,
      hour: 20,
      minute: 5,
      ingredients: [
        { name: "Wheat Flour", quantity: 120 },
        { name: "Tomato", quantity: 80 },
        { name: "Mozzarella", quantity: 90 }
      ]
    },
    {
      name: "Salmon quinoa",
      mealType: "LUNCH" as const,
      daysAgo: 0,
      hour: 12,
      minute: 30,
      ingredients: [
        { name: "Salmon", quantity: 150 },
        { name: "Olive Oil", quantity: 8 },
        { name: "Spinach", quantity: 100 }
      ]
    }
  ];

  for (const meal of meals) {
    await prisma.meal.create({
      data: {
        userId: user.id,
        name: meal.name,
        mealType: meal.mealType,
        eatenAt: atLocal(meal.daysAgo, meal.hour, meal.minute),
        items: {
          create: meal.ingredients
            .map((ingredient) => ({
              ingredientId: ingredientIdByName.get(ingredient.name),
              quantity: ingredient.quantity
            }))
            .filter((item): item is { ingredientId: string; quantity: number } => Boolean(item.ingredientId))
            .map((item) => ({ ingredientId: item.ingredientId, quantity: item.quantity }))
        }
      }
    });
  }

  const daySymptomProfiles: Array<{ daysAgo: number; morning: number[]; evening: number[] }> = [
    { daysAgo: 6, morning: [4, 3, 4, 3, 3, 2, 6, 7, 7], evening: [4, 3, 4, 4, 3, 2, 6, 7, 7] },
    { daysAgo: 5, morning: [5, 4, 5, 4, 4, 3, 5, 6, 6], evening: [7, 6, 7, 6, 5, 4, 4, 5, 5] },
    { daysAgo: 4, morning: [7, 5, 7, 6, 6, 4, 4, 5, 5], evening: [4, 3, 4, 4, 3, 2, 6, 7, 7] },
    { daysAgo: 3, morning: [4, 3, 4, 3, 3, 2, 7, 7, 7], evening: [5, 4, 5, 5, 4, 3, 5, 6, 6] },
    { daysAgo: 2, morning: [6, 5, 6, 6, 5, 4, 4, 5, 5], evening: [4, 3, 4, 4, 3, 2, 7, 8, 8] },
    { daysAgo: 1, morning: [3, 3, 3, 3, 2, 2, 7, 8, 8], evening: [5, 4, 5, 4, 4, 3, 6, 6, 6] },
    { daysAgo: 0, morning: [6, 5, 6, 6, 5, 4, 4, 5, 5], evening: [5, 4, 5, 5, 4, 3, 6, 6, 6] }
  ];

  for (const profile of daySymptomProfiles) {
    await prisma.symptomLog.create({
      data: {
        userId: user.id,
        loggedAt: atLocal(profile.daysAgo, 9, 10),
        entries: {
          create: SYMPTOMS.map((symptom, index) => ({ symptom, severity: profile.morning[index] ?? 5 }))
        }
      }
    });
    await prisma.symptomLog.create({
      data: {
        userId: user.id,
        loggedAt: atLocal(profile.daysAgo, 19, 25),
        entries: {
          create: SYMPTOMS.map((symptom, index) => ({ symptom, severity: profile.evening[index] ?? 5 }))
        }
      }
    });
  }

  await prisma.recipe.createMany({
    data: [
      { userId: user.id, name: "Protein Bowl" },
      { userId: user.id, name: "Quick Pasta" }
    ]
  });

  const recipeRows = await prisma.recipe.findMany({ where: { userId: user.id } });
  const recipeByName = new Map(recipeRows.map((recipe) => [recipe.name, recipe.id]));

  await prisma.recipeItem.createMany({
    data: [
      { recipeId: recipeByName.get("Protein Bowl")!, ingredientId: ingredientIdByName.get("Chicken")! },
      { recipeId: recipeByName.get("Protein Bowl")!, ingredientId: ingredientIdByName.get("Rice")! },
      { recipeId: recipeByName.get("Protein Bowl")!, ingredientId: ingredientIdByName.get("Spinach")! },
      { recipeId: recipeByName.get("Quick Pasta")!, ingredientId: ingredientIdByName.get("Wheat Flour")! },
      { recipeId: recipeByName.get("Quick Pasta")!, ingredientId: ingredientIdByName.get("Tomato")! },
      { recipeId: recipeByName.get("Quick Pasta")!, ingredientId: ingredientIdByName.get("Mozzarella")! }
    ]
  });

  const snapshotRows = [
    { ingredient: "Wheat Flour", symptom: "bloating", impactScore: 7.3, sampleSize: 16, confidence: "HIGH" as const },
    { ingredient: "Wheat Flour", symptom: "inflammation", impactScore: 6.8, sampleSize: 14, confidence: "HIGH" as const },
    { ingredient: "Mozzarella", symptom: "fatigue", impactScore: 6.1, sampleSize: 10, confidence: "MEDIUM" as const },
    { ingredient: "Milk", symptom: "bloating", impactScore: 5.9, sampleSize: 9, confidence: "MEDIUM" as const },
    { ingredient: "Rice", symptom: "digestionQuality", impactScore: 2.6, sampleSize: 11, confidence: "MEDIUM" as const },
    { ingredient: "Spinach", symptom: "energy", impactScore: 2.1, sampleSize: 12, confidence: "HIGH" as const },
    { ingredient: "Salmon", symptom: "inflammation", impactScore: 2.4, sampleSize: 8, confidence: "MEDIUM" as const }
  ];

  await prisma.ingredientImpactSnapshot.createMany({
    data: snapshotRows
      .map((row) => ({
        userId: user.id,
        ingredientId: ingredientIdByName.get(row.ingredient),
        impactScore: row.impactScore,
        sampleSize: row.sampleSize,
        confidence: row.confidence,
        symptom: row.symptom,
        computedAt: atLocal(0, 10, 0)
      }))
      .filter((row): row is NonNullable<typeof row> & { ingredientId: string } => Boolean(row.ingredientId))
      .map((row) => ({
        userId: row.userId,
        ingredientId: row.ingredientId,
        impactScore: row.impactScore,
        sampleSize: row.sampleSize,
        confidence: row.confidence,
        symptom: row.symptom,
        computedAt: row.computedAt
      }))
  });

  console.log(`Seeded demo user ${user.id} with meals, symptoms, recipes, and impact snapshots.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
