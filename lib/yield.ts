import { Decimal } from "@prisma/client/runtime/library";
import { ProductType } from "@prisma/client";
import { normalizeWastagePercent, usableQuantity } from "@/lib/ingredient-wastage";
import { isRetailProduct } from "@/lib/product-fulfillment";
import { sumQuantityInUnit, unitsAreCompatible } from "@/lib/unit-conversion";

type IngredientWithItem = {
  quantityRequired: Decimal | number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    isActive: boolean;
    wastagePercent?: Decimal | number | null;
    inventoryItems: {
      id: string;
      name: string;
      quantity: Decimal | number;
      unit: string;
      isActive: boolean;
    }[];
  };
};

type RecipeWithIngredients = {
  id: string;
  name: string;
  category: string;
  yieldQuantity: Decimal | number;
  yieldUnit: string;
  productType?: ProductType;
  retailQuantityPerSale?: Decimal | number | null;
  retailInventoryItem?: {
    id: string;
    name: string;
    quantity: Decimal | number;
    unit: string;
    isActive: boolean;
    ingredient?: { wastagePercent?: Decimal | number | null } | null;
  } | null;
  ingredients: IngredientWithItem[];
};

export type YieldResult = {
  productId: string;
  productName: string;
  category: string;
  yieldUnit: string;
  /** Max portions from physical stock (before kitchen commitments). */
  maxYield: number;
  bottleneckIngredient: string | null;
  /** Human-readable stock note for the limiting raw material (includes wastage). */
  bottleneckNote: string | null;
  missingIngredients: string[];
  /** True when stock/BOM allows at least one portion from on-hand inventory. */
  canMake: boolean;
  /** Servings on active orders not yet deducted at kitchen. */
  committedQty?: number;
  /** Portions still available to sell (maxYield − committed). */
  availableYield?: number;
  /** True when canMake and availableYield > 0. */
  canSell?: boolean;
};

function toNumber(value: Decimal | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return value.toNumber();
}

function formatQty(amount: number, unit: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded} ${unit}`;
}

export function calculateRecipeYield(recipe: RecipeWithIngredients): YieldResult {
  if (isRetailProduct(recipe as never)) {
    const item = recipe.retailInventoryItem;
    const perSale = recipe.retailQuantityPerSale;
    if (!item || perSale == null || toNumber(perSale) <= 0) {
      return {
        productId: recipe.id,
        productName: recipe.name,
        category: recipe.category,
        yieldUnit: recipe.yieldUnit,
        maxYield: 0,
        bottleneckIngredient: null,
        bottleneckNote: null,
      missingIngredients: ["Link a stock item and quantity per sale"],
        canMake: false,
      };
    }

    const waste = normalizeWastagePercent(item.ingredient?.wastagePercent);
    const physical = toNumber(item.quantity);
    const available = usableQuantity(physical, waste);
    const required = toNumber(perSale);
    const maxYield = available > 0 ? Math.floor(available / required) : 0;

    return {
      productId: recipe.id,
      productName: recipe.name,
      category: recipe.category,
      yieldUnit: recipe.yieldUnit,
      maxYield,
      bottleneckIngredient: item.name,
      bottleneckNote:
        waste > 0
          ? `${formatQty(available, item.unit)} usable (${formatQty(physical, item.unit)} on hand, ${waste}% waste)`
          : `${formatQty(physical, item.unit)} on hand`,
      missingIngredients:
        maxYield <= 0
          ? [
              waste > 0
                ? `${item.name} (no usable stock after ${waste}% waste)`
                : item.name,
            ]
          : [],
      canMake: maxYield > 0 && item.isActive,
    };
  }

  if (recipe.ingredients.length === 0) {
    return {
      productId: recipe.id,
      productName: recipe.name,
      category: recipe.category,
      yieldUnit: recipe.yieldUnit,
      maxYield: 0,
      bottleneckIngredient: null,
      bottleneckNote: null,
      missingIngredients: ["No raw materials defined"],
      canMake: false,
    };
  }

  const missingIngredients: string[] = [];
  let minYield = Infinity;
  let bottleneckIngredient: string | null = null;
  let bottleneckNote: string | null = null;

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = recipeIngredient.ingredient;
    const unit = recipeIngredient.unit;
    const waste = normalizeWastagePercent(ingredient.wastagePercent);

    if (!ingredient.isActive) {
      missingIngredients.push(`${ingredient.name} (inactive)`);
      minYield = 0;
      continue;
    }

    const activeItems = ingredient.inventoryItems.filter((item) => item.isActive);
    const compatibleItems = activeItems.filter((item) =>
      unitsAreCompatible(item.unit as never, unit as never)
    );

    if (compatibleItems.length === 0 && activeItems.length > 0) {
      const units = Array.from(new Set(activeItems.map((item) => item.unit))).join(", ");
      missingIngredients.push(
        `${ingredient.name} (unit mismatch: need ${unit}, have ${units})`
      );
      minYield = 0;
      continue;
    }

    const physical = sumQuantityInUnit(
      compatibleItems.map((item) => ({
        quantity: item.quantity,
        unit: item.unit as never,
        isActive: true,
      })),
      unit as never
    );
    const available = usableQuantity(physical, waste);
    const required = toNumber(recipeIngredient.quantityRequired);

    if (physical <= 0 || available <= 0) {
      missingIngredients.push(
        waste > 0
          ? `${ingredient.name} (no usable stock after ${waste}% waste)`
          : ingredient.name
      );
      minYield = 0;
      continue;
    }

    const possible = Math.floor(available / required);

    if (possible < minYield) {
      minYield = possible;
      bottleneckIngredient = ingredient.name;
      bottleneckNote =
        waste > 0
          ? `${formatQty(available, unit)} usable (${formatQty(physical, unit)} on hand, ${waste}% waste)`
          : `${formatQty(available, unit)} on hand`;
    }
  }

  if (minYield === Infinity) minYield = 0;

  return {
    productId: recipe.id,
    productName: recipe.name,
    category: recipe.category,
    yieldUnit: recipe.yieldUnit,
    maxYield: minYield,
    bottleneckIngredient,
    bottleneckNote,
    missingIngredients,
    canMake: minYield > 0 && missingIngredients.length === 0,
  };
}

export function calculateAllYields(recipes: RecipeWithIngredients[]): YieldResult[] {
  return recipes
    .map(calculateRecipeYield)
    .sort((a, b) => b.maxYield - a.maxYield);
}

export function isLowStock(
  quantity: Decimal | number | string,
  reorderLevel: Decimal | number | string
): boolean {
  return toNumber(quantity) <= toNumber(reorderLevel);
}
