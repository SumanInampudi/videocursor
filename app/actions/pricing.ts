"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { estimateProductIngredientCost } from "@/lib/costing";
import { smartMatches } from "@/lib/smart-search";
import { productPricingSchema } from "@/lib/validations";

export async function updateProductPricing(productId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const salePriceRaw = String(raw.salePrice ?? "").trim();

  const prepRaw = String(raw.prepTimeMinutes ?? "").trim();

  const parsed = productPricingSchema.safeParse({
    salePrice: salePriceRaw === "" ? null : salePriceRaw,
    prepTimeMinutes: prepRaw === "" ? null : prepRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.product.update({
    where: { id: productId },
    data: {
      salePrice: parsed.data.salePrice,
      prepTimeMinutes: parsed.data.prepTimeMinutes,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}/pricing`);
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  revalidatePath("/orders/pos");
  revalidatePath("/orders/kitchen");
  return { success: true };
}

export async function getProductPricingDetail(productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      retailInventoryItem: {
        include: {
          ingredient: { select: { wastagePercent: true } },
          costLayers: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              inventoryItems: {
                where: { isActive: true },
                include: {
                  costLayers: {
                    where: { quantityRemaining: { gt: 0 } },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  const costEstimate = estimateProductIngredientCost(product, 1);

  return serializeForClient({ product, costEstimate });
}

export async function getProductsWithPricing(search?: string) {
  const { businessId } = await requireBusinessContext();
  const products = await db.product.findMany({
    where: { businessId },
    include: {
      retailInventoryItem: {
        include: {
          ingredient: { select: { wastagePercent: true } },
          costLayers: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              inventoryItems: {
                where: { isActive: true },
                include: {
                  costLayers: {
                    where: { quantityRemaining: { gt: 0 } },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = products.map((product) => ({
    ...product,
    costEstimate: estimateProductIngredientCost(product, 1),
  }));

  if (!search?.trim()) {
    return serializeForClient(rows);
  }

  return serializeForClient(
    rows.filter((product) =>
      smartMatches(
        [product.name, product.category, product.productType, product.description],
        search
      )
    )
  );
}

export async function getInventoryCostHistory(inventoryItemId: string) {
  const rows = await db.inventoryCostHistory.findMany({
    where: { inventoryItemId },
    orderBy: { effectiveAt: "desc" },
    take: 50,
  });
  return serializeForClient(rows);
}
