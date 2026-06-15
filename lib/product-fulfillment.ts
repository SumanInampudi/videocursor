import { Decimal } from "@prisma/client/runtime/library";
import { ProductType, Unit } from "@prisma/client";
import {
  type CostLayerSnapshot,
  planFifoConsumption,
  type FifoConsumptionSlice,
} from "@/lib/inventory-fifo";
import { planInventoryDeductions, type FulfillmentResult } from "@/lib/orderFulfillment";

type StockItem = {
  id: string;
  quantity: Decimal | number;
  unit: Unit;
  costPerUnit: Decimal | number;
  isActive: boolean;
  costLayers?: CostLayerSnapshot[];
  ingredient?: { wastagePercent?: Decimal | number | null } | null;
};

export type ProductForStockPlan = {
  id: string;
  name: string;
  productType: ProductType;
  ingredients: Parameters<typeof planInventoryDeductions>[0];
  retailInventoryItem?: StockItem | null;
  retailQuantityPerSale?: Decimal | number | null;
  prepOutputInventoryItem?: StockItem | null;
  inclusionOutputQuantity?: Decimal | number | null;
  yieldUnit?: string;
};

function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function isRetailProduct(product: { productType?: ProductType }): boolean {
  return product.productType === ProductType.RETAIL;
}

export function productRequiresKitchen(product: {
  productType: ProductType;
  requiresKitchen: boolean;
}): boolean {
  if (isRetailProduct(product)) return product.requiresKitchen;
  return product.requiresKitchen;
}

function planPrepInclusionDeduction(
  product: ProductForStockPlan,
  batchCount: number
): FulfillmentResult {
  const item = product.prepOutputInventoryItem;
  const perServing = product.inclusionOutputQuantity;
  if (!item) {
    return { ok: false, error: `Prep "${product.name}" has no output stock link` };
  }
  if (perServing == null || toNumber(perServing) <= 0) {
    return {
      ok: false,
      error: `Prep "${product.name}" needs a per-inclusion serving size (edit under Prep items)`,
    };
  }

  const needed = toNumber(perServing) * batchCount;
  const waste =
    item.ingredient?.wastagePercent != null ? toNumber(item.ingredient.wastagePercent) : 0;

  const result = planFifoConsumption({
    needed,
    unit: item.unit,
    wastagePercent: waste,
    inventoryItems: [
      {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        isActive: item.isActive,
        costLayers: item.costLayers,
      },
    ],
  });

  if (!result.ok) {
    return {
      ok: false,
      error: `Insufficient prep stock for ${product.name}: ${result.error}`,
    };
  }

  return {
    ok: true,
    consumptions: result.consumptions as FifoConsumptionSlice[],
    totalCost: result.totalCost,
  };
}

export function planProductStockDeduction(
  product: ProductForStockPlan,
  batchCount: number
): FulfillmentResult {
  if (product.productType === ProductType.PREP) {
    return planPrepInclusionDeduction(product, batchCount);
  }

  if (!isRetailProduct(product)) {
    return planInventoryDeductions(product.ingredients, batchCount);
  }

  const item = product.retailInventoryItem;
  const perSale = product.retailQuantityPerSale;
  if (!item) {
    return { ok: false, error: `Retail item "${product.name}" has no inventory link` };
  }
  if (perSale == null || toNumber(perSale) <= 0) {
    return { ok: false, error: `Retail item "${product.name}" has invalid quantity per sale` };
  }

  const needed = toNumber(perSale) * batchCount;
  const waste =
    item.ingredient?.wastagePercent != null ? toNumber(item.ingredient.wastagePercent) : 0;

  const result = planFifoConsumption({
    needed,
    unit: item.unit,
    wastagePercent: waste,
    inventoryItems: [
      {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        isActive: item.isActive,
        costLayers: item.costLayers,
      },
    ],
  });

  if (!result.ok) {
    return { ok: false, error: `Insufficient stock for ${product.name}: ${result.error}` };
  }

  return {
    ok: true,
    consumptions: result.consumptions as FifoConsumptionSlice[],
    totalCost: result.totalCost,
  };
}

export function isKitchenLine(product: {
  productType?: ProductType;
  requiresKitchen?: boolean;
} | null | undefined): boolean {
  if (!product) return true;
  return productRequiresKitchen({
    productType: product.productType ?? ProductType.PREPARED,
    requiresKitchen: product.requiresKitchen ?? true,
  });
}

/** Lines that deduct inventory when the order moves to packing. */
export function lineNeedsStockFulfillment(line: {
  isIncluded?: boolean;
  product?: { productType?: ProductType; requiresKitchen?: boolean } | null;
}): boolean {
  if (!line.product) return false;
  if (line.product.productType === ProductType.PREP) return true;
  return isKitchenLine(line.product);
}

export type KitchenLineLike = {
  quantity: number;
  kitchenDoneQty?: number;
  product?: { productType?: ProductType; requiresKitchen?: boolean } | null;
};

export function filterKitchenLines<T extends KitchenLineLike>(lines: T[]): T[] {
  return lines.filter((l) => isKitchenLine(l.product));
}

export function isCounterLine(product: {
  productType?: ProductType;
  requiresKitchen?: boolean;
} | null | undefined): boolean {
  if (!product) return false;
  return !isKitchenLine(product);
}

export function filterRetailLines<T extends KitchenLineLike>(lines: T[]): T[] {
  return lines.filter((l) => isCounterLine(l.product));
}

export function orderHasKitchenLines(lines: KitchenLineLike[]): boolean {
  return filterKitchenLines(lines).length > 0;
}

export function orderHasRetailLines(lines: KitchenLineLike[]): boolean {
  return filterRetailLines(lines).length > 0;
}

export function counterLineProgressForRetail(lines: KitchenLineLike[]): {
  done: number;
  total: number;
} {
  const retail = filterRetailLines(lines);
  const total = retail.reduce((s, l) => s + l.quantity, 0);
  const done = retail.reduce(
    (s, l) => s + Math.min(l.quantity, Math.max(0, l.kitchenDoneQty ?? 0)),
    0
  );
  return { done, total };
}

export function kitchenLineProgressForKitchen(lines: KitchenLineLike[]): {
  done: number;
  total: number;
} {
  const kitchen = filterKitchenLines(lines);
  const total = kitchen.reduce((s, l) => s + l.quantity, 0);
  const done = kitchen.reduce(
    (s, l) => s + Math.min(l.quantity, Math.max(0, l.kitchenDoneQty ?? 0)),
    0
  );
  return { done, total };
}
