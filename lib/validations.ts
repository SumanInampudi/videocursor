import { z } from "zod";
import { UNITS } from "./units";

export const PRODUCT_TYPES = ["PREPARED", "RETAIL"] as const;

export const inventoryItemSchema = z.object({
  ingredientId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().optional(),
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
  wastagePercent: z.coerce.number().min(0).max(99).default(0),
  aliases: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

export const productIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantityRequired: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.enum(UNITS),
});

export const productInclusionSchema = z.object({
  includedProductId: z.string().min(1, "Select an included product"),
  quantityPerParent: z.coerce
    .number()
    .int()
    .positive("Quantity per portion must be at least 1"),
});

export const productSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    yieldQuantity: z.coerce.number().positive("Yield quantity must be greater than 0"),
    yieldUnit: z.string().min(1, "Yield unit is required"),
    salePrice: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : val),
      z.union([z.null(), z.coerce.number().min(0, "Price must be 0 or greater")])
    ),
    prepTimeMinutes: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : val),
      z.union([z.null(), z.coerce.number().int().min(1, "Prep time must be at least 1 minute")])
    ),
    posCode: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : val),
      z.union([
        z.null(),
        z.coerce.number().int().min(1, "POS code must be at least 1").max(9999, "POS code too large"),
      ])
    ),
    instructions: z.string().optional(),
    productType: z.enum(PRODUCT_TYPES).default("PREPARED"),
    requiresKitchen: z
      .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
      .transform((v) => v === true || v === "true" || v === "on")
      .default(true),
    retailInventoryItemId: z.string().optional(),
    retailQuantityPerSale: z.coerce.number().optional(),
    ingredients: z.array(productIngredientSchema).default([]),
    inclusions: z.array(productInclusionSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.productType === "RETAIL") {
      if (!data.retailInventoryItemId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Select the inventory item to sell",
          path: ["retailInventoryItemId"],
        });
      }
      if (data.retailQuantityPerSale == null || data.retailQuantityPerSale <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Quantity per sale must be greater than 0",
          path: ["retailQuantityPerSale"],
        });
      }
      return;
    }

    if (data.ingredients.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "At least one ingredient is required",
        path: ["ingredients"],
      });
    }

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

    const seenInclusions = new Set<string>();
    data.inclusions.forEach((row, index) => {
      if (seenInclusions.has(row.includedProductId)) {
        ctx.addIssue({
          code: "custom",
          message: "Do not add the same included product twice",
          path: ["inclusions", index, "includedProductId"],
        });
      }
      seenInclusions.add(row.includedProductId);
    });
  });

export type ProductInput = z.infer<typeof productSchema>;

export const productPricingSchema = z.object({
  salePrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.union([z.null(), z.coerce.number().min(0, "Price must be 0 or greater")])
  ),
  prepTimeMinutes: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.union([
      z.null(),
      z.coerce.number().int().min(1, "Prep time must be at least 1 minute"),
    ])
  ),
});

export const orderLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
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
    createNewItem: z
      .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
      .optional()
      .transform((v) => v === true || v === "true" || v === "on"),
    newItemName: z.string().optional(),
    newItemSku: z.string().optional(),
    newItemCategory: z.string().optional(),
    newItemUnit: z.enum(UNITS).optional(),
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
    if (!data.inventoryItemId && !data.createNewItem) {
      ctx.addIssue({
        code: "custom",
        message: "Select an item or create a new SKU",
        path: ["inventoryItemId"],
      });
    }

    if (data.createNewItem && !data.inventoryItemId) {
      if (!data.newItemName?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "New item name is required",
          path: ["newItemName"],
        });
      }
      if (!data.newItemSku?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "New item SKU is required",
          path: ["newItemSku"],
        });
      }
      if (!data.newItemCategory?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "New item category is required",
          path: ["newItemCategory"],
        });
      }
      if (!data.newItemUnit) {
        ctx.addIssue({
          code: "custom",
          message: "New item unit is required",
          path: ["newItemUnit"],
        });
      }
    }

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
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
});

export const discountSchema = z.object({
  code: z.string().min(2, "Code is required").transform((c) => c.toUpperCase().trim()),
  name: z.string().min(1, "Name is required"),
  kind: z.enum([
    "CHECK_PERCENT",
    "CHECK_FIXED",
    "ITEM_PERCENT",
    "ITEM_FIXED",
    "BOGO",
    "COMBO_PRICE",
    "TIERED_SPEND",
    "TIERED_QUANTITY",
    "CUSTOMER_SEGMENT",
  ]),
  application: z.enum(["CODE", "AUTO", "PAYMENT_METHOD"]).default("CODE"),
  value: z.coerce.number().positive("Value must be greater than 0"),
  minOrderAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  maxDiscountAmount: z.coerce.number().min(0).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  channelDineIn: z.boolean().optional(),
  channelOnline: z.boolean().optional(),
  targetType: z.enum(["ALL_PRODUCTS", "CATEGORY", "PRODUCT"]).optional(),
  targetCategories: z.string().optional(),
  targetProductIds: z.string().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleDays: z.string().optional(),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
  bogoBuyQuantity: z.coerce.number().int().min(1).optional(),
  bogoGetQuantity: z.coerce.number().int().min(1).optional(),
  bogoApplyToCheapest: z.boolean().optional(),
  tiersJson: z.string().optional(),
  customerSegment: z.enum(["FIRST_ORDER", "BIRTHDAY_MONTH", "RETURNING"]).optional(),
  segmentValueType: z.enum(["PERCENT", "FIXED"]).optional(),
  segmentMinVisitCount: z.coerce.number().int().min(1).optional(),
  paymentCash: z.boolean().optional(),
  paymentCard: z.boolean().optional(),
  paymentPhonePe: z.boolean().optional(),
});

const orderPaymentMethods = ["CASH", "CARD", "PHONEPE"] as const;

const orderChannels = ["DINE_IN", "ONLINE"] as const;

const managerDiscountFields = {
  managerDiscountMode: z.enum(["FIXED", "PERCENT"]).optional(),
  managerDiscountValue: z.coerce.number().min(0).optional(),
  managerDiscountReason: z.string().optional(),
  compLinesJson: z.string().optional(),
};

export const createOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  discountCode: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(orderPaymentMethods).optional(),
  channel: z.enum(orderChannels).default("DINE_IN"),
  diningTableId: z.string().optional(),
  externalRef: z.string().optional(),
  lines: z.array(orderLineSchema).min(1, "Add at least one item"),
  ...managerDiscountFields,
});

const tipAmountField = z.coerce.number().min(0, "Tip cannot be negative").optional();

export const posCheckoutSchema = createOrderSchema.extend({
  paymentMethod: z.enum(orderPaymentMethods, { message: "Select a payment method" }),
  tipAmount: tipAmountField,
});

/** Send to kitchen without payment (dine-in pay at close). */
export const posSendToKitchenSchema = createOrderSchema.extend({
  paymentMethod: z.undefined().optional(),
  covers: z.coerce.number().int().min(1).max(99).optional(),
});

export const settleOrderSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.enum(orderPaymentMethods, { message: "Select a payment method" }),
  discountCode: z.string().optional(),
  tipAmount: tipAmountField,
  ...managerDiscountFields,
});

export const addOrderLinesSchema = z.object({
  orderId: z.string().min(1),
  lines: z.array(orderLineSchema).min(1, "Add at least one item"),
});

export const reservationSchema = z.object({
  id: z.string().optional(),
  diningTableId: z.string().optional(),
  guestName: z.string().min(1, "Guest name is required"),
  phone: z.string().optional(),
  partySize: z.coerce.number().int().min(1).max(99).default(2),
  reservedAt: z.string().min(1, "Date and time are required"),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(90),
  notes: z.string().optional(),
});

export const stockReceiveLineSchema = z.object({
  ingredientId: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
  unit: z.enum(UNITS),
});

export const stockReceiveSchema = z
  .object({
    supplierId: z.string().optional(),
    paymentStatus: z.enum(purchasePaymentStatuses),
    amountPaid: z.coerce.number().min(0).optional(),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    invoiceRef: z.string().optional(),
    lines: z.array(stockReceiveLineSchema).min(1, "Add at least one item"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === "PARTIAL") {
      const total = data.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
      const paid = data.amountPaid ?? 0;
      if (paid <= 0 || paid >= total) {
        ctx.addIssue({
          code: "custom",
          message: "Partial payment must be more than 0 and less than total",
          path: ["amountPaid"],
        });
      }
    }
    for (const line of data.lines) {
      if (line.unitCost <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter unit cost for each line",
          path: ["lines"],
        });
        break;
      }
    }
  });
