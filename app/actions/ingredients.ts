"use server";

import {
  bulkCreateRawMaterials,
  createQuickRawMaterial,
  createRawMaterial,
  createStockFromRawMaterial,
  getRawMaterialCategories,
  getRawMaterials,
  updateRawMaterial,
} from "@/app/actions/raw-materials";

// Legacy ingredient-named exports (compatibility shims)
export const getIngredients = getRawMaterials;
export const getIngredientCategories = getRawMaterialCategories;
export const createIngredient = createRawMaterial;
export const createQuickIngredient = createQuickRawMaterial;
export const updateIngredient = updateRawMaterial;
export const bulkCreateIngredients = bulkCreateRawMaterials;
export const createInventoryFromIngredient = createStockFromRawMaterial;

// Preferred raw-material exports
export {
  getRawMaterials,
  getRawMaterialCategories,
  createRawMaterial,
  createQuickRawMaterial,
  updateRawMaterial,
  bulkCreateRawMaterials,
  createStockFromRawMaterial,
};
