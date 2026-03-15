import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const symptomEntrySchema = z.object({
  symptom: z.string(),
  severity: z.number().min(1).max(10)
});

export const symptomRouter = createTRPCRouter({
  quickLogSymptoms: protectedProcedure
    .input(
      z.object({
        entries: z.array(symptomEntrySchema).min(1)
      })
    )
    .output(
      z.object({
        id: z.string(),
        loggedAt: z.date(),
        entries: z.array(symptomEntrySchema)
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.symptomLog.create({
        data: {
          userId: ctx.userId,
          entries: {
            create: input.entries
          }
        },
        include: { entries: true }
      });
    }),
  listTodaySymptoms: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          loggedAt: z.date(),
          entries: z.array(
            z.object({
              id: z.string(),
              symptom: z.string(),
              severity: z.number()
            })
          )
        })
      )
    )
    .query(async ({ ctx }) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      return ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId, loggedAt: { gte: start } },
        select: {
          id: true,
          loggedAt: true,
          entries: { select: { id: true, symptom: true, severity: true } }
        },
        orderBy: { loggedAt: "desc" }
      });
    })
});
