import { z } from "zod";
import { UNITS } from "./units";

export const inventoryItemSchema = z.object({
  ingredientId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  unit: z.enum(UNITS),
  reorderLevel: z.coerce.number().min(0, "Reorder level must be 0 or greater"),
  costPerUnit: z.coerce.number().min(0, "Cost must be 0 or greater"),
  supplier: z.string().optional(),
  storageLocation: z.string().optional(),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const ingredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  defaultUnit: z.enum(UNITS),
  aliases: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantityRequired: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.enum(UNITS),
});

export const recipeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  yieldQuantity: z.coerce.number().positive("Yield quantity must be greater than 0"),
  yieldUnit: z.string().min(1, "Yield unit is required"),
  instructions: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, "At least one ingredient is required"),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();

  data.ingredients.forEach((ingredient, index) => {
    if (seen.has(ingredient.ingredientId)) {
      ctx.addIssue({
        code: "custom",
        message: "Do not add the same ingredient twice",
        path: ["ingredients", index, "ingredientId"],
      });
    }
    seen.add(ingredient.ingredientId);
  });
});

export type RecipeInput = z.infer<typeof recipeSchema>;
