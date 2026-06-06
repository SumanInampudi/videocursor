"use server";

import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";

export type SetupStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export async function getSetupProgress(): Promise<{
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}> {
  const { businessId } = await requireBusinessContext();

  const [rawMaterialCount, stockWithQty, productCount, bomCount, pricedProductCount] =
    await Promise.all([
      db.ingredient.count({ where: { businessId, isActive: true } }),
      db.inventoryItem.count({
        where: { businessId, isActive: true, quantity: { gt: 0 } },
      }),
      db.product.count({ where: { businessId } }),
      db.productIngredient.count({ where: { product: { businessId } } }),
      db.product.count({ where: { businessId, salePrice: { not: null } } }),
    ]);

  const steps: SetupStep[] = [
    {
      id: "raw_materials",
      label: "Add raw materials",
      description: "Catalog ingredients you buy and cook with.",
      href: "/raw-materials",
      done: rawMaterialCount > 0,
    },
    {
      id: "stock",
      label: "Receive stock",
      description: "Record on-hand quantities and costs.",
      href: "/inventory/receive",
      done: stockWithQty > 0,
    },
    {
      id: "products",
      label: "Create products",
      description: "Menu items you sell at the register.",
      href: "/products/new",
      done: productCount > 0,
    },
    {
      id: "bom",
      label: "Link product BOM",
      description: "Attach raw materials to prepared dishes.",
      href: "/products",
      done: bomCount > 0,
    },
    {
      id: "pricing",
      label: "Set sale prices",
      description: "At least one priced item for POS.",
      href: "/products",
      done: pricedProductCount > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
  };
}
