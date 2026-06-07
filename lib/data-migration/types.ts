export const DATA_EXPORT_TYPES = [
  "raw_materials",
  "inventory",
  "products",
  "product_ingredients",
  "customers",
  "suppliers",
  "discounts",
] as const;

export type DataExportType = (typeof DATA_EXPORT_TYPES)[number];

/** Legacy template URLs from before the products / raw materials rename. */
export const LEGACY_DATA_EXPORT_ALIASES: Record<string, DataExportType> = {
  ingredients: "raw_materials",
  recipes: "products",
  recipe_ingredients: "product_ingredients",
};

export function normalizeDataExportType(type: string): DataExportType | null {
  if (DATA_EXPORT_TYPES.includes(type as DataExportType)) {
    return type as DataExportType;
  }
  return LEGACY_DATA_EXPORT_ALIASES[type] ?? null;
}

export const DATA_TYPE_LABELS: Record<DataExportType, string> = {
  raw_materials: "Raw materials",
  inventory: "Inventory stock",
  products: "Products (menu items)",
  product_ingredients: "Product BOM (raw materials per product)",
  customers: "Customers",
  suppliers: "Suppliers",
  discounts: "Discount codes",
};

export const TEMPLATE_HEADERS: Record<DataExportType, string[]> = {
  raw_materials: [
    "name",
    "category",
    "default_unit",
    "sku",
    "aliases",
    "notes",
    "is_active",
  ],
  inventory: [
    "name",
    "sku",
    "category",
    "raw_material_name",
    "quantity",
    "unit",
    "reorder_level",
    "cost_per_unit",
    "supplier_name",
    "storage_location",
    "is_active",
  ],
  products: [
    "name",
    "category",
    "description",
    "yield_quantity",
    "yield_unit",
    "sale_price",
    "image_url",
    "instructions",
  ],
  product_ingredients: ["product_name", "raw_material_name", "quantity_required", "unit"],
  customers: ["name", "phone", "email", "notes"],
  suppliers: ["name", "contact_phone", "email", "address", "notes", "is_active"],
  discounts: [
    "code",
    "name",
    "kind",
    "value",
    "min_order_amount",
    "is_active",
    "valid_from",
    "valid_to",
  ],
};

export const TEMPLATE_EXAMPLE_ROW: Record<DataExportType, string[]> = {
  raw_materials: ["Mozzarella", "Dairy", "KG", "MOZZ-001", "mozzarella cheese", "", "true"],
  inventory: [
    "Mozzarella Block 1kg",
    "MOZZ-STK-001",
    "Dairy",
    "Mozzarella",
    "5",
    "KG",
    "2",
    "450",
    "Fresh Farms",
    "Cold room A",
    "true",
  ],
  products: [
    "Margherita Pizza",
    "Pizza",
    "Classic tomato and cheese",
    "1",
    "Pcs",
    "299",
    "",
    "Bake 12 min",
  ],
  product_ingredients: ["Margherita Pizza", "Mozzarella", "0.15", "KG"],
  customers: ["Rahul Sharma", "9876543210", "rahul@example.com", "Regular"],
  suppliers: ["Fresh Farms", "9123456780", "orders@freshfarms.com", "Pune", "", "true"],
  discounts: ["WELCOME10", "Welcome 10%", "CHECK_PERCENT", "10", "200", "true", "", ""],
};
