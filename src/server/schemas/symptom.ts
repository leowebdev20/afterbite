import { z } from "zod";

export const symptomKeys = [
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

export const symptomKeySchema = z.enum(symptomKeys);

export const symptomEntrySchema = z.object({
  symptom: symptomKeySchema,
  severity: z.number().int().min(1).max(10)
});

export const symptomDateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().min(1).max(200).optional()
});

export const quickLogSymptomsInputSchema = z.object({
  loggedAt: z.date().optional(),
  entries: z.array(symptomEntrySchema).min(1)
});

export const updateSymptomLogInputSchema = quickLogSymptomsInputSchema.extend({
  id: z.string()
});
