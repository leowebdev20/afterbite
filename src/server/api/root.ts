import { createTRPCRouter } from "@/server/api/trpc";
import { mealRouter } from "@/server/api/routers/meal";
import { symptomRouter } from "@/server/api/routers/symptom";
import { recipeRouter } from "@/server/api/routers/recipe";
import { insightRouter } from "@/server/api/routers/insight";
import { forecastRouter } from "@/server/api/routers/forecast";

export const appRouter = createTRPCRouter({
  meal: mealRouter,
  symptom: symptomRouter,
  recipe: recipeRouter,
  insight: insightRouter,
  forecast: forecastRouter
});

export type AppRouter = typeof appRouter;
