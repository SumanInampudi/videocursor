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

/** Recipe → ingredients → stock (orders, pricing, previews). */
export const recipeIngredientsWithFifoStock = {
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
