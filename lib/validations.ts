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
  supplierId: z.string().optional(),
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

export const recipePricingSchema = z.object({
  salePrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.union([z.null(), z.coerce.number().min(0, "Price must be 0 or greater")])
  ),
});

export const orderLineSchema = z.object({
  recipeId: z.string().min(1, "Recipe is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
});

const expenseCategoryValues = [
  "RENT",
  "SALARIES",
  "UTILITIES",
  "SUPPLIES",
  "MARKETING",
  "EQUIPMENT",
  "INSURANCE",
  "MAINTENANCE",
  "OTHER",
] as const;

export const expenseSchema = z.object({
  category: z.enum(expenseCategoryValues),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Use a valid month (YYYY-MM)"),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

const purchasePaymentStatuses = ["PAID", "CREDIT", "PARTIAL"] as const;

export const inventoryPurchaseSchema = z
  .object({
    inventoryItemId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    supplierId: z.string().optional(),
    supplier: z.string().optional(),
    totalAmount: z.coerce.number().positive("Amount must be greater than 0"),
    paymentStatus: z.enum(purchasePaymentStatuses),
    amountPaid: z.coerce.number().min(0).optional(),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === "PARTIAL") {
      const paid = data.amountPaid ?? 0;
      if (paid <= 0 || paid >= data.totalAmount) {
        ctx.addIssue({
          code: "custom",
          message: "Partial payment must be more than 0 and less than total",
          path: ["amountPaid"],
        });
      }
    }
  });

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPhone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const discountSchema = z.object({
  code: z.string().min(2, "Code is required").transform((c) => c.toUpperCase().trim()),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().positive("Value must be greater than 0"),
  minOrderAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

const orderPaymentMethods = ["CASH", "CARD", "PHONEPE"] as const;

export const createOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  discountCode: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(orderPaymentMethods).optional(),
  lines: z.array(orderLineSchema).min(1, "Add at least one item"),
});

export const posCheckoutSchema = createOrderSchema.extend({
  paymentMethod: z.enum(orderPaymentMethods, { message: "Select a payment method" }),
});
