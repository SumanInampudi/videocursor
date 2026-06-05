"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/auth";
import { requireBusinessContext } from "@/lib/business-context";
import { parseCsv, rowsToObjects, stringifyCsv } from "@/lib/csv";
import {
  DATA_EXPORT_TYPES,
  TEMPLATE_EXAMPLE_ROW,
  TEMPLATE_HEADERS,
  type DataExportType,
} from "@/lib/data-migration/types";
import { db } from "@/lib/db";
import { generateIngredientBarcode, generateProductBarcode } from "@/lib/barcode";
import { ingredientSkuPrefix, normalizeIngredientName } from "@/lib/ingredients";
import { DiscountType, Unit } from "@prisma/client";

export async function getTemplateCsv(type: DataExportType): Promise<string> {
  await requireAdminSession();
  const headers = TEMPLATE_HEADERS[type];
  const example = TEMPLATE_EXAMPLE_ROW[type];
  return stringifyCsv([headers, example]);
}

export async function exportDataCsv(type: DataExportType): Promise<string> {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  switch (type) {
    case "ingredients": {
      const rows = await db.ingredient.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.ingredients,
        ...rows.map((r) => [
          r.name,
          r.category,
          r.defaultUnit,
          r.sku,
          r.barcode,
          r.aliases ?? "",
          r.notes ?? "",
          String(r.isActive),
        ]),
      ]);
    }
    case "inventory": {
      const rows = await db.inventoryItem.findMany({
        where: { businessId },
        include: { ingredient: true, supplierRef: true },
        orderBy: { name: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.inventory,
        ...rows.map((r) => [
          r.name,
          r.sku,
          r.category,
          r.ingredient?.name ?? "",
          String(r.quantity),
          r.unit,
          String(r.reorderLevel),
          String(r.costPerUnit),
          r.supplierRef?.name ?? r.supplier ?? "",
          r.storageLocation ?? "",
          String(r.isActive),
        ]),
      ]);
    }
    case "recipes": {
      const rows = await db.product.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.recipes,
        ...rows.map((r) => [
          r.name,
          r.category,
          r.description ?? "",
          String(r.yieldQuantity),
          r.yieldUnit,
          r.salePrice != null ? String(r.salePrice) : "",
          r.barcode,
          r.imageUrl ?? "",
          r.instructions ?? "",
        ]),
      ]);
    }
    case "recipe_ingredients": {
      const rows = await db.productIngredient.findMany({
        where: { product: { businessId } },
        include: { product: true, ingredient: true },
        orderBy: { product: { name: "asc" } },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.recipe_ingredients,
        ...rows.map((r) => [
          r.product.name,
          r.ingredient.name,
          String(r.quantityRequired),
          r.unit,
        ]),
      ]);
    }
    case "customers": {
      const rows = await db.customer.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.customers,
        ...rows.map((r) => [r.name, r.phone ?? "", r.email ?? "", r.notes ?? ""]),
      ]);
    }
    case "suppliers": {
      const rows = await db.supplier.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.suppliers,
        ...rows.map((r) => [
          r.name,
          r.contactPhone ?? "",
          r.email ?? "",
          r.address ?? "",
          r.notes ?? "",
          String(r.isActive),
        ]),
      ]);
    }
    case "discounts": {
      const rows = await db.discount.findMany({
        where: { businessId },
        orderBy: { code: "asc" },
      });
      return stringifyCsv([
        TEMPLATE_HEADERS.discounts,
        ...rows.map((r) => [
          r.code,
          r.name,
          r.type,
          String(r.value),
          r.minOrderAmount != null ? String(r.minOrderAmount) : "",
          String(r.isActive),
          r.validFrom ? r.validFrom.toISOString().slice(0, 10) : "",
          r.validTo ? r.validTo.toISOString().slice(0, 10) : "",
        ]),
      ]);
    }
    default:
      throw new Error("Unknown export type");
  }
}

function parseBool(v: string, defaultValue = true) {
  const s = v.trim().toLowerCase();
  if (!s) return defaultValue;
  return s === "true" || s === "1" || s === "yes";
}

function parseUnit(v: string): Unit {
  const u = v.trim() as Unit;
  if (Object.values(Unit).includes(u)) return u;
  throw new Error(`Invalid unit: ${v}`);
}

export async function importDataCsv(
  type: DataExportType,
  csvText: string
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  const rows = parseCsv(csvText);
  const errors: string[] = [];
  let imported = 0;

  try {
    switch (type) {
      case "ingredients": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, [
          "name",
          "category",
          "default_unit",
        ]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const name = row.name;
            const normalized = normalizeIngredientName(name);
            const sku =
              row.sku?.trim() ||
              `${ingredientSkuPrefix(name)}-001`;
            const barcode =
              row.barcode?.trim() || generateIngredientBarcode(name);
            await db.ingredient.upsert({
              where: {
                businessId_normalizedName: { businessId, normalizedName: normalized },
              },
              create: {
                businessId,
                name,
                normalizedName: normalized,
                sku,
                barcode,
                category: row.category || "General",
                defaultUnit: parseUnit(row.default_unit || "pcs"),
                aliases: row.aliases || null,
                notes: row.notes || null,
                isActive: parseBool(row.is_active ?? "true"),
              },
              update: {
                name,
                category: row.category || "General",
                defaultUnit: parseUnit(row.default_unit || "pcs"),
                aliases: row.aliases || null,
                notes: row.notes || null,
                isActive: parseBool(row.is_active ?? "true"),
              },
            });
            imported++;
          } catch (e) {
            errors.push(`${row.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      case "inventory": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, [
          "name",
          "sku",
          "quantity",
          "unit",
        ]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            let ingredientId: string | undefined;
            if (row.ingredient_name?.trim()) {
              const ing = await db.ingredient.findFirst({
                where: {
                  businessId,
                  normalizedName: normalizeIngredientName(row.ingredient_name),
                },
              });
              ingredientId = ing?.id;
            }
            let supplierId: string | undefined;
            if (row.supplier_name?.trim()) {
              const existing = await db.supplier.findFirst({
                where: { businessId, name: row.supplier_name.trim() },
              });
              if (existing) supplierId = existing.id;
              else {
                const created = await db.supplier.create({
                  data: { businessId, name: row.supplier_name.trim() },
                });
                supplierId = created.id;
              }
            }
            await db.inventoryItem.upsert({
              where: { businessId_sku: { businessId, sku: row.sku.trim() } },
              create: {
                businessId,
                name: row.name,
                sku: row.sku.trim(),
                category: row.category || "General",
                ingredientId,
                supplierId,
                quantity: Number(row.quantity) || 0,
                unit: parseUnit(row.unit || "pcs"),
                reorderLevel: Number(row.reorder_level) || 0,
                costPerUnit: Number(row.cost_per_unit) || 0,
                supplier: row.supplier_name || null,
                storageLocation: row.storage_location || null,
                isActive: parseBool(row.is_active ?? "true"),
              },
              update: {
                name: row.name,
                category: row.category || "General",
                ingredientId,
                supplierId,
                quantity: Number(row.quantity) || 0,
                unit: parseUnit(row.unit || "pcs"),
                reorderLevel: Number(row.reorder_level) || 0,
                costPerUnit: Number(row.cost_per_unit) || 0,
                supplier: row.supplier_name || null,
                storageLocation: row.storage_location || null,
                isActive: parseBool(row.is_active ?? "true"),
              },
            });
            imported++;
          } catch (e) {
            errors.push(`${row.sku}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      case "recipes": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, ["name", "category"]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const barcode = row.barcode?.trim() || generateProductBarcode(row.name);
            const existing = await db.product.findFirst({
              where: { businessId, barcode },
            });
            if (existing && existing.name !== row.name) {
              errors.push(`${row.name}: barcode conflict`);
              continue;
            }
            if (existing) {
              await db.product.update({
                where: { id: existing.id },
                data: {
                  name: row.name,
                  category: row.category || "General",
                  description: row.description || null,
                  yieldQuantity: Number(row.yield_quantity) || 1,
                  yieldUnit: row.yield_unit || "pcs",
                  salePrice: row.sale_price ? Number(row.sale_price) : null,
                  imageUrl: row.image_url || null,
                  instructions: row.instructions || null,
                },
              });
            } else {
              await db.product.create({
                data: {
                  businessId,
                  name: row.name,
                  category: row.category || "General",
                  description: row.description || null,
                  yieldQuantity: Number(row.yield_quantity) || 1,
                  yieldUnit: row.yield_unit || "pcs",
                  salePrice: row.sale_price ? Number(row.sale_price) : null,
                  barcode,
                  imageUrl: row.image_url || null,
                  instructions: row.instructions || null,
                },
              });
            }
            imported++;
          } catch (e) {
            errors.push(`${row.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      case "recipe_ingredients": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, [
          "recipe_name",
          "ingredient_name",
          "quantity_required",
          "unit",
        ]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const product = await db.product.findFirst({
              where: { businessId, name: row.recipe_name },
            });
            const ingredient = await db.ingredient.findFirst({
              where: {
                businessId,
                normalizedName: normalizeIngredientName(row.ingredient_name),
              },
            });
            if (!product || !ingredient) {
              errors.push(
                `${row.recipe_name}/${row.ingredient_name}: product or ingredient not found`
              );
              continue;
            }
            const existing = await db.productIngredient.findFirst({
              where: { productId: product.id, ingredientId: ingredient.id },
            });
            if (existing) {
              await db.productIngredient.update({
                where: { id: existing.id },
                data: {
                  quantityRequired: Number(row.quantity_required) || 0,
                  unit: parseUnit(row.unit),
                },
              });
            } else {
              await db.productIngredient.create({
                data: {
                  productId: product.id,
                  ingredientId: ingredient.id,
                  quantityRequired: Number(row.quantity_required) || 0,
                  unit: parseUnit(row.unit),
                },
              });
            }
            imported++;
          } catch (e) {
            errors.push(
              `${row.recipe_name}: ${e instanceof Error ? e.message : "failed"}`
            );
          }
        }
        break;
      }
      case "customers": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, ["name"]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const existing = await db.customer.findFirst({
              where: { businessId, name: row.name },
            });
            if (existing) {
              await db.customer.update({
                where: { id: existing.id },
                data: {
                  phone: row.phone || null,
                  email: row.email || null,
                  notes: row.notes || null,
                },
              });
            } else {
              await db.customer.create({
                data: {
                  businessId,
                  name: row.name,
                  phone: row.phone || null,
                  email: row.email || null,
                  notes: row.notes || null,
                },
              });
            }
            imported++;
          } catch (e) {
            errors.push(`${row.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      case "suppliers": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, ["name"]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const existing = await db.supplier.findFirst({
              where: { businessId, name: row.name },
            });
            if (existing) {
              await db.supplier.update({
                where: { id: existing.id },
                data: {
                  contactPhone: row.contact_phone || null,
                  email: row.email || null,
                  address: row.address || null,
                  notes: row.notes || null,
                  isActive: parseBool(row.is_active ?? "true"),
                },
              });
            } else {
              await db.supplier.create({
                data: {
                  businessId,
                  name: row.name,
                  contactPhone: row.contact_phone || null,
                  email: row.email || null,
                  address: row.address || null,
                  notes: row.notes || null,
                  isActive: parseBool(row.is_active ?? "true"),
                },
              });
            }
            imported++;
          } catch (e) {
            errors.push(`${row.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      case "discounts": {
        const { data, error } = rowsToObjects<Record<string, string>>(rows, [
          "code",
          "name",
          "type",
          "value",
        ]);
        if (error) return { success: false, imported: 0, errors: [error] };
        for (const row of data) {
          try {
            const type =
              row.type.toUpperCase() === "FIXED" ? DiscountType.FIXED : DiscountType.PERCENT;
            await db.discount.upsert({
              where: {
                businessId_code: {
                  businessId,
                  code: row.code.trim().toUpperCase(),
                },
              },
              create: {
                businessId,
                code: row.code.trim().toUpperCase(),
                name: row.name,
                type,
                value: Number(row.value) || 0,
                minOrderAmount: row.min_order_amount
                  ? Number(row.min_order_amount)
                  : null,
                isActive: parseBool(row.is_active ?? "true"),
                validFrom: row.valid_from ? new Date(row.valid_from) : null,
                validTo: row.valid_to ? new Date(row.valid_to) : null,
              },
              update: {
                name: row.name,
                type,
                value: Number(row.value) || 0,
                minOrderAmount: row.min_order_amount
                  ? Number(row.min_order_amount)
                  : null,
                isActive: parseBool(row.is_active ?? "true"),
                validFrom: row.valid_from ? new Date(row.valid_from) : null,
                validTo: row.valid_to ? new Date(row.valid_to) : null,
              },
            });
            imported++;
          } catch (e) {
            errors.push(`${row.code}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
        break;
      }
      default:
        return { success: false, imported: 0, errors: ["Unknown type"] };
    }
  } catch (e) {
    return {
      success: false,
      imported,
      errors: [e instanceof Error ? e.message : "Import failed"],
    };
  }

  for (const path of ["/", "/ingredients", "/raw-materials", "/products", "/inventory", "/customers", "/suppliers", "/discounts", "/orders/pos"]) {
    revalidatePath(path);
  }

  return {
    success: errors.length === 0,
    imported,
    errors: errors.slice(0, 50),
  };
}

export async function exportAllDataBundle(): Promise<Record<DataExportType, string>> {
  await requireAdminSession();
  const bundle = {} as Record<DataExportType, string>;
  for (const type of DATA_EXPORT_TYPES) {
    bundle[type] = await exportDataCsv(type);
  }
  return bundle;
}
