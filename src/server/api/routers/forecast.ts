import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { predictTomorrow } from "@/server/services/forecasting/tomorrow";

export const forecastRouter = createTRPCRouter({
  getTomorrowPrediction: protectedProcedure.query(async () => {
    return predictTomorrow(
      {
        bloating: 4,
        stomachPain: 2,
        inflammation: 3,
        fatigue: 4,
        brainFog: 2,
        headache: 2,
        digestionQuality: 5,
        mood: 6,
        energy: 5
      },
      1.5
    );
  }),
  getDailyImpactScore: protectedProcedure.query(async () => {
    return {
      score: 4.9,
      confidence: "medium"
    };
  })
});
