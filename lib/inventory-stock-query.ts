/** Ingredient + active inventory + FIFO layers (for stock checks and costing). */
export const ingredientWithFifoStockInclude = {
  include: {
    inventoryItems: {
      where: { isActive: true },
      include: {
        costLayers: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { createdAt: "asc" as const },
        },
      },
    },
  },
} as const;

/** Product → ingredients → stock (orders, pricing, previews). */
export const productIngredientsWithFifoStock = {
  retailInventoryItem: {
    include: {
      ingredient: { select: { wastagePercent: true } },
      costLayers: {
        where: { quantityRemaining: { gt: 0 } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
  ingredients: {
    include: {
      ingredient: ingredientWithFifoStockInclude,
    },
  },
} as const;
