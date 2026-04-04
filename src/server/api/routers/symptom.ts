import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  quickLogSymptomsInputSchema,
  symptomDateRangeSchema,
  symptomEntrySchema,
  updateSymptomLogInputSchema
} from "@/server/schemas/symptom";
import { TRPCError } from "@trpc/server";
import { getTodayUtcRange } from "@/server/services/timezone";

const symptomLogOutputSchema = z.object({
  id: z.string(),
  loggedAt: z.date(),
  entries: z.array(
    z.object({
      id: z.string(),
      symptom: symptomEntrySchema.shape.symptom,
      severity: z.number()
    })
  )
});

export const symptomRouter = createTRPCRouter({
  quickLogSymptoms: protectedProcedure
    .input(quickLogSymptomsInputSchema)
    .output(
      z.object({
        id: z.string(),
        loggedAt: z.date(),
        entries: z.array(z.object({ symptom: symptomEntrySchema.shape.symptom, severity: z.number() }))
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.symptomLog.create({
        data: {
          userId: ctx.userId,
          loggedAt: input.loggedAt ?? new Date(),
          entries: {
            create: input.entries
          }
        },
        include: { entries: true }
      }).then((log) => ({
        id: log.id,
        loggedAt: log.loggedAt,
        entries: log.entries.map((entry) => ({
          symptom: symptomEntrySchema.shape.symptom.parse(entry.symptom),
          severity: entry.severity
        }))
      }));
    }),
  updateSymptomLog: protectedProcedure
    .input(updateSymptomLogInputSchema)
    .output(
      z.object({
        id: z.string(),
        loggedAt: z.date(),
        entries: z.array(z.object({ symptom: symptomEntrySchema.shape.symptom, severity: z.number() }))
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.symptomLog.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true }
      });
      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Symptom log not found" });
      }

      return ctx.db.symptomLog.update({
        where: { id: log.id },
        data: {
          loggedAt: input.loggedAt ?? new Date(),
          entries: {
            deleteMany: {},
            create: input.entries
          }
        },
        include: { entries: true }
      }).then((updated) => ({
        id: updated.id,
        loggedAt: updated.loggedAt,
        entries: updated.entries.map((entry) => ({
          symptom: symptomEntrySchema.shape.symptom.parse(entry.symptom),
          severity: entry.severity
        }))
      }));
    }),
  deleteSymptomLog: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.symptomLog.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true }
      });
      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Symptom log not found" });
      }
      return ctx.db.symptomLog.delete({ where: { id: log.id }, select: { id: true } });
    }),
  listSymptoms: protectedProcedure
    .input(symptomDateRangeSchema.optional())
    .output(z.array(symptomLogOutputSchema))
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const where = {
        userId: ctx.userId,
        ...(input?.from || input?.to
          ? {
              loggedAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {})
              }
            }
          : {})
      };

      return ctx.db.symptomLog.findMany({
        where,
        select: {
          id: true,
          loggedAt: true,
          entries: { select: { id: true, symptom: true, severity: true } }
        },
        orderBy: { loggedAt: "desc" },
        take: limit
      }).then((logs) =>
        logs.map((log) => ({
          id: log.id,
          loggedAt: log.loggedAt,
          entries: log.entries.map((entry) => ({
            id: entry.id,
            symptom: symptomEntrySchema.shape.symptom.parse(entry.symptom),
            severity: entry.severity
          }))
        }))
      );
    }),
  listTodaySymptoms: protectedProcedure
    .output(z.array(symptomLogOutputSchema))
    .query(async ({ ctx }) => {
      const { start, end } = getTodayUtcRange(ctx.timeZone);

      return ctx.db.symptomLog.findMany({
        where: { userId: ctx.userId, loggedAt: { gte: start, lt: end } },
        select: {
          id: true,
          loggedAt: true,
          entries: { select: { id: true, symptom: true, severity: true } }
        },
        orderBy: { loggedAt: "desc" }
      }).then((logs) =>
        logs.map((log) => ({
          id: log.id,
          loggedAt: log.loggedAt,
          entries: log.entries.map((entry) => ({
            id: entry.id,
            symptom: symptomEntrySchema.shape.symptom.parse(entry.symptom),
            severity: entry.severity
          }))
        }))
      );
    })
});
