import { z } from "zod";

export const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"]);
export const mealDateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().min(1).max(200).optional()
});

export const mealItemInputSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive().max(5000).optional().nullable()
});

const mealBaseInputObject = z.object({
  name: z.string().trim().min(1).max(120),
  mealType: mealTypeSchema.optional(),
  eatenAt: z.date().optional(),
  ingredientIds: z.array(z.string()).min(1).optional(),
  items: z.array(mealItemInputSchema).min(1).optional()
});

export const mealBaseInputSchema = mealBaseInputObject
  .refine((value) => (value.items?.length ?? 0) > 0 || (value.ingredientIds?.length ?? 0) > 0, {
    message: "At least one ingredient is required."
  });

export const quickAddMealInputSchema = mealBaseInputSchema;

export const updateMealInputSchema = mealBaseInputObject
  .extend({
    id: z.string()
  })
  .refine((value) => (value.items?.length ?? 0) > 0 || (value.ingredientIds?.length ?? 0) > 0, {
    message: "At least one ingredient is required."
  });
