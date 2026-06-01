import {
  DiscountType,
  OrderPaymentMethod,
  OrderStatus,
  Prisma,
  PrismaClient,
  PurchasePaymentStatus,
  Unit,
  UserRole,
} from "@prisma/client";
import { hashPassword } from "../lib/password";
import { generateIngredientBarcode, generateRecipeBarcode } from "../lib/barcode";
import { STARTER_INGREDIENTS, ingredientSkuPrefix, normalizeIngredientName } from "../lib/ingredients";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function orderNumber(suffix: string) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `ORD-${y}${m}${day}-${suffix}`;
}

async function createIngredient(name: string, category: string, defaultUnit: Unit) {
  const normalized = normalizeIngredientName(name);
  const existing = await prisma.ingredient.findUnique({ where: { normalizedName: normalized } });
  if (existing) return existing;

  return prisma.ingredient.create({
    data: {
      name,
      normalizedName: normalized,
      sku: `${ingredientSkuPrefix(name)}-001`,
      barcode: generateIngredientBarcode(name),
      category,
      defaultUnit,
      isActive: true,
    },
  });
}

type StockInput = {
  ingredientName: string;
  sku: string;
  quantity: number;
  unit: Unit;
  reorderLevel: number;
  costPerUnit: number;
  supplierId?: string;
  supplierLabel?: string;
  storageLocation?: string;
};

async function createStock(
  ingredientId: string,
  name: string,
  category: string,
  input: StockInput
) {
  const item = await prisma.inventoryItem.create({
    data: {
      ingredientId,
      supplierId: input.supplierId,
      name,
      sku: input.sku,
      category,
      quantity: input.quantity,
      unit: input.unit,
      reorderLevel: input.reorderLevel,
      costPerUnit: input.costPerUnit,
      supplier: input.supplierLabel,
      storageLocation: input.storageLocation,
      isActive: true,
    },
  });

  await prisma.inventoryCostHistory.create({
    data: {
      inventoryItemId: item.id,
      costPerUnit: input.costPerUnit,
      note: "Seed initial cost",
    },
  });

  return item;
}

type RecipeIng = { ingredientId: string; inventoryItemId: string; qty: number; unit: Unit };

async function createRecipe(
  name: string,
  category: string,
  salePrice: number,
  yieldQty: number,
  yieldUnit: string,
  ings: RecipeIng[],
  description?: string
) {
  return prisma.recipe.create({
    data: {
      name,
      category,
      description,
      yieldQuantity: yieldQty,
      yieldUnit,
      salePrice,
      barcode: generateRecipeBarcode(name),
      instructions: `Standard prep for ${name}.`,
      ingredients: {
        create: ings.map((i) => ({
          ingredientId: i.ingredientId,
          inventoryItemId: i.inventoryItemId,
          quantityRequired: i.qty,
          unit: i.unit,
        })),
      },
    },
  });
}

async function main() {
  console.log("Clearing existing data…");

  await prisma.orderLineConsumption.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryPurchase.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.inventoryCostHistory.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.ingredient.deleteMany();

  console.log("Creating suppliers…");
  const metro = await prisma.supplier.create({
    data: {
      name: "Metro Foods Wholesale",
      contactPhone: "+91 98765 43210",
      email: "orders@metrofoods.demo",
      address: "12 Industrial Area, Hyderabad",
      isActive: true,
    },
  });
  const dairy = await prisma.supplier.create({
    data: {
      name: "Dairy Fresh Co",
      contactPhone: "+91 98765 11122",
      email: "billing@dairyfresh.demo",
      isActive: true,
    },
  });
  const greenValley = await prisma.supplier.create({
    data: {
      name: "Green Valley Farms",
      contactPhone: "+91 91234 56789",
      notes: "Produce deliveries Mon/Wed/Fri",
      isActive: true,
    },
  });

  console.log("Creating ingredients & inventory…");
  const ingMap = new Map<string, Awaited<ReturnType<typeof createIngredient>>>();

  for (const ing of STARTER_INGREDIENTS) {
    ingMap.set(ing.name, await createIngredient(ing.name, ing.category, ing.defaultUnit));
  }

  const extraIngredients: { name: string; category: string; unit: Unit }[] = [
    { name: "All-Purpose Flour", category: "Dry Goods", unit: Unit.g },
    { name: "Mozzarella Cheese", category: "Dairy", unit: Unit.g },
    { name: "Fresh Tomatoes", category: "Produce", unit: Unit.g },
    { name: "Active Dry Yeast", category: "Baking", unit: Unit.g },
    { name: "Paneer", category: "Dairy", unit: Unit.g },
    { name: "Milk", category: "Dairy", unit: Unit.ml },
    { name: "Sugar", category: "Dry Goods", unit: Unit.g },
    { name: "Tea Leaves", category: "Beverages", unit: Unit.g },
    { name: "Coffee Powder", category: "Beverages", unit: Unit.g },
    { name: "Potato", category: "Produce", unit: Unit.g },
    { name: "Onion", category: "Produce", unit: Unit.g },
    { name: "Ginger Garlic Paste", category: "Produce", unit: Unit.g },
  ];

  for (const ing of extraIngredients) {
    ingMap.set(ing.name, await createIngredient(ing.name, ing.category, ing.unit));
  }

  const stockMap = new Map<string, Awaited<ReturnType<typeof createStock>>>();

  const stockDefs: (StockInput & { name: string; category: string })[] = [
    {
      ingredientName: "All-Purpose Flour",
      name: "All-Purpose Flour",
      sku: "FLR-001",
      category: "Dry Goods",
      quantity: 8000,
      unit: Unit.g,
      reorderLevel: 2000,
      costPerUnit: 0.002,
      supplierId: metro.id,
      supplierLabel: metro.name,
      storageLocation: "Dry A1",
    },
    {
      ingredientName: "Mozzarella Cheese",
      name: "Mozzarella Cheese",
      sku: "CHZ-001",
      category: "Dairy",
      quantity: 180,
      unit: Unit.g,
      reorderLevel: 500,
      costPerUnit: 0.015,
      supplierId: dairy.id,
      supplierLabel: dairy.name,
      storageLocation: "Cold B2",
    },
    {
      ingredientName: "Chicken Boneless",
      name: "Chicken Boneless",
      sku: "CHK-001",
      category: "Meat",
      quantity: 5000,
      unit: Unit.g,
      reorderLevel: 1500,
      costPerUnit: 0.012,
      supplierId: metro.id,
      storageLocation: "Cold A1",
    },
    {
      ingredientName: "Basmati Rice",
      name: "Basmati Rice",
      sku: "RCE-001",
      category: "Rice & Grains",
      quantity: 6000,
      unit: Unit.g,
      reorderLevel: 1000,
      costPerUnit: 0.003,
      supplierId: metro.id,
      storageLocation: "Dry A2",
    },
    {
      ingredientName: "Fresh Tomatoes",
      name: "Fresh Tomatoes",
      sku: "TOM-001",
      category: "Produce",
      quantity: 2000,
      unit: Unit.g,
      reorderLevel: 400,
      costPerUnit: 0.004,
      supplierId: greenValley.id,
      storageLocation: "Cold C1",
    },
    {
      ingredientName: "Oil",
      name: "Cooking Oil",
      sku: "OIL-001",
      category: "Oils",
      quantity: 3000,
      unit: Unit.ml,
      reorderLevel: 800,
      costPerUnit: 0.008,
      supplierId: metro.id,
      storageLocation: "Dry B1",
    },
    {
      ingredientName: "Salt",
      name: "Salt",
      sku: "SLT-001",
      category: "Spices",
      quantity: 800,
      unit: Unit.g,
      reorderLevel: 150,
      costPerUnit: 0.001,
      storageLocation: "Spice Rack",
    },
    {
      ingredientName: "Active Dry Yeast",
      name: "Active Dry Yeast",
      sku: "YST-001",
      category: "Baking",
      quantity: 150,
      unit: Unit.g,
      reorderLevel: 50,
      costPerUnit: 0.02,
      storageLocation: "Dry A1",
    },
    {
      ingredientName: "Paneer",
      name: "Paneer",
      sku: "PNR-001",
      category: "Dairy",
      quantity: 1200,
      unit: Unit.g,
      reorderLevel: 400,
      costPerUnit: 0.018,
      supplierId: dairy.id,
      storageLocation: "Cold B1",
    },
    {
      ingredientName: "Milk",
      name: "Full Cream Milk",
      sku: "MLK-001",
      category: "Dairy",
      quantity: 5000,
      unit: Unit.ml,
      reorderLevel: 2000,
      costPerUnit: 0.006,
      supplierId: dairy.id,
      storageLocation: "Cold B2",
    },
    {
      ingredientName: "Tea Leaves",
      name: "Assam Tea Leaves",
      sku: "TEA-001",
      category: "Beverages",
      quantity: 500,
      unit: Unit.g,
      reorderLevel: 100,
      costPerUnit: 0.012,
      storageLocation: "Dry C2",
    },
    {
      ingredientName: "Coffee Powder",
      name: "Coffee Powder",
      sku: "COF-001",
      category: "Beverages",
      quantity: 400,
      unit: Unit.g,
      reorderLevel: 80,
      costPerUnit: 0.025,
      storageLocation: "Dry C2",
    },
    {
      ingredientName: "Sugar",
      name: "Sugar",
      sku: "SUG-001",
      category: "Dry Goods",
      quantity: 3000,
      unit: Unit.g,
      reorderLevel: 500,
      costPerUnit: 0.0015,
      storageLocation: "Dry A2",
    },
    {
      ingredientName: "Potato",
      name: "Potato",
      sku: "POT-001",
      category: "Produce",
      quantity: 4000,
      unit: Unit.g,
      reorderLevel: 800,
      costPerUnit: 0.003,
      supplierId: greenValley.id,
      storageLocation: "Cold C2",
    },
    {
      ingredientName: "Onion",
      name: "Onion",
      sku: "ONN-001",
      category: "Produce",
      quantity: 3500,
      unit: Unit.g,
      reorderLevel: 700,
      costPerUnit: 0.0025,
      supplierId: greenValley.id,
      storageLocation: "Cold C2",
    },
    {
      ingredientName: "Garam Masala",
      name: "Garam Masala",
      sku: "GMS-001",
      category: "Spices",
      quantity: 300,
      unit: Unit.g,
      reorderLevel: 80,
      costPerUnit: 0.02,
      storageLocation: "Spice Rack",
    },
    {
      ingredientName: "Curd",
      name: "Curd",
      sku: "CRD-001",
      category: "Dairy",
      quantity: 2000,
      unit: Unit.g,
      reorderLevel: 500,
      costPerUnit: 0.004,
      supplierId: dairy.id,
      storageLocation: "Cold B1",
    },
  ];

  for (const def of stockDefs) {
    const ing = ingMap.get(def.ingredientName)!;
    const item = await createStock(ing.id, def.name, def.category, def);
    stockMap.set(def.ingredientName, item);
  }

  const g = (name: string) => ingMap.get(name)!;
  const s = (name: string) => stockMap.get(name)!;

  console.log("Creating recipes…");
  const margherita = await createRecipe(
    "Margherita Pizza",
    "Pizza",
    299,
    1,
    "pizza",
    [
      { ingredientId: g("All-Purpose Flour").id, inventoryItemId: s("All-Purpose Flour").id, qty: 200, unit: Unit.g },
      { ingredientId: g("Mozzarella Cheese").id, inventoryItemId: s("Mozzarella Cheese").id, qty: 120, unit: Unit.g },
      { ingredientId: g("Fresh Tomatoes").id, inventoryItemId: s("Fresh Tomatoes").id, qty: 80, unit: Unit.g },
      { ingredientId: g("Active Dry Yeast").id, inventoryItemId: s("Active Dry Yeast").id, qty: 5, unit: Unit.g },
    ],
    "Classic tomato and mozzarella pizza"
  );

  const paneerPizza = await createRecipe(
    "Paneer Tikka Pizza",
    "Pizza",
    349,
    1,
    "pizza",
    [
      { ingredientId: g("All-Purpose Flour").id, inventoryItemId: s("All-Purpose Flour").id, qty: 200, unit: Unit.g },
      { ingredientId: g("Paneer").id, inventoryItemId: s("Paneer").id, qty: 100, unit: Unit.g },
      { ingredientId: g("Mozzarella Cheese").id, inventoryItemId: s("Mozzarella Cheese").id, qty: 80, unit: Unit.g },
      { ingredientId: g("Onion").id, inventoryItemId: s("Onion").id, qty: 40, unit: Unit.g },
    ]
  );

  const chickenCurry = await createRecipe(
    "Chicken Curry",
    "Curry",
    280,
    2,
    "portions",
    [
      { ingredientId: g("Chicken Boneless").id, inventoryItemId: s("Chicken Boneless").id, qty: 400, unit: Unit.g },
      { ingredientId: g("Fresh Tomatoes").id, inventoryItemId: s("Fresh Tomatoes").id, qty: 150, unit: Unit.g },
      { ingredientId: g("Onion").id, inventoryItemId: s("Onion").id, qty: 100, unit: Unit.g },
      { ingredientId: g("Oil").id, inventoryItemId: s("Oil").id, qty: 30, unit: Unit.ml },
      { ingredientId: g("Garam Masala").id, inventoryItemId: s("Garam Masala").id, qty: 8, unit: Unit.g },
    ]
  );

  const vegBiryani = await createRecipe(
    "Veg Biryani",
    "Rice",
    220,
    1,
    "plate",
    [
      { ingredientId: g("Basmati Rice").id, inventoryItemId: s("Basmati Rice").id, qty: 200, unit: Unit.g },
      { ingredientId: g("Potato").id, inventoryItemId: s("Potato").id, qty: 80, unit: Unit.g },
      { ingredientId: g("Curd").id, inventoryItemId: s("Curd").id, qty: 50, unit: Unit.g },
      { ingredientId: g("Garam Masala").id, inventoryItemId: s("Garam Masala").id, qty: 5, unit: Unit.g },
    ]
  );

  const chickenBiryani = await createRecipe(
    "Chicken Biryani",
    "Rice",
    320,
    1,
    "plate",
    [
      { ingredientId: g("Basmati Rice").id, inventoryItemId: s("Basmati Rice").id, qty: 200, unit: Unit.g },
      { ingredientId: g("Chicken Boneless").id, inventoryItemId: s("Chicken Boneless").id, qty: 150, unit: Unit.g },
      { ingredientId: g("Curd").id, inventoryItemId: s("Curd").id, qty: 40, unit: Unit.g },
      { ingredientId: g("Garam Masala").id, inventoryItemId: s("Garam Masala").id, qty: 6, unit: Unit.g },
    ]
  );

  const masalaChai = await createRecipe(
    "Masala Chai",
    "Beverages",
    40,
    1,
    "cup",
    [
      { ingredientId: g("Tea Leaves").id, inventoryItemId: s("Tea Leaves").id, qty: 4, unit: Unit.g },
      { ingredientId: g("Milk").id, inventoryItemId: s("Milk").id, qty: 120, unit: Unit.ml },
      { ingredientId: g("Sugar").id, inventoryItemId: s("Sugar").id, qty: 10, unit: Unit.g },
    ]
  );

  const coldCoffee = await createRecipe(
    "Cold Coffee",
    "Beverages",
    120,
    1,
    "glass",
    [
      { ingredientId: g("Coffee Powder").id, inventoryItemId: s("Coffee Powder").id, qty: 12, unit: Unit.g },
      { ingredientId: g("Milk").id, inventoryItemId: s("Milk").id, qty: 200, unit: Unit.ml },
      { ingredientId: g("Sugar").id, inventoryItemId: s("Sugar").id, qty: 15, unit: Unit.g },
    ]
  );

  const samosa = await createRecipe(
    "Samosa (2 pcs)",
    "Snacks",
    60,
    2,
    "pieces",
    [
      { ingredientId: g("All-Purpose Flour").id, inventoryItemId: s("All-Purpose Flour").id, qty: 60, unit: Unit.g },
      { ingredientId: g("Potato").id, inventoryItemId: s("Potato").id, qty: 100, unit: Unit.g },
      { ingredientId: g("Oil").id, inventoryItemId: s("Oil").id, qty: 40, unit: Unit.ml },
    ]
  );

  const garlicNaan = await createRecipe(
    "Garlic Naan",
    "Breads",
    50,
    1,
    "piece",
    [
      { ingredientId: g("All-Purpose Flour").id, inventoryItemId: s("All-Purpose Flour").id, qty: 80, unit: Unit.g },
      { ingredientId: g("Curd").id, inventoryItemId: s("Curd").id, qty: 20, unit: Unit.g },
    ]
  );

  const butterNaan = await createRecipe(
    "Butter Naan",
    "Breads",
    45,
    1,
    "piece",
    [
      { ingredientId: g("All-Purpose Flour").id, inventoryItemId: s("All-Purpose Flour").id, qty: 80, unit: Unit.g },
      { ingredientId: g("Curd").id, inventoryItemId: s("Curd").id, qty: 20, unit: Unit.g },
    ]
  );

  const recipeByName = new Map([
    ["Margherita Pizza", margherita],
    ["Paneer Tikka Pizza", paneerPizza],
    ["Chicken Curry", chickenCurry],
    ["Veg Biryani", vegBiryani],
    ["Chicken Biryani", chickenBiryani],
    ["Masala Chai", masalaChai],
    ["Cold Coffee", coldCoffee],
    ["Samosa (2 pcs)", samosa],
    ["Garlic Naan", garlicNaan],
    ["Butter Naan", butterNaan],
  ]);

  console.log("Creating customers, discounts, settings…");
  const customerRajesh = await prisma.customer.create({
    data: {
      name: "Rajesh Kumar",
      phone: "+91 99887 76655",
      email: "rajesh.k@demo.com",
      notes: "VIP — prefers paneer pizza, pays PhonePe",
    },
  });

  const customerPriya = await prisma.customer.create({
    data: {
      name: "Priya Sharma",
      phone: "+91 98765 12345",
      email: "priya@demo.com",
    },
  });

  const customerAnil = await prisma.customer.create({
    data: {
      name: "Anil Mehta",
      phone: "+91 91234 00099",
      notes: "Has not ordered in 30+ days — win-back candidate",
    },
  });

  await prisma.customer.create({
    data: { name: "Walk-in Guest", phone: null },
  });

  const discountWelcome = await prisma.discount.create({
    data: {
      code: "WELCOME10",
      name: "Welcome 10% off",
      type: DiscountType.PERCENT,
      value: 10,
      minOrderAmount: 200,
      isActive: true,
    },
  });

  await prisma.discount.create({
    data: {
      code: "FLAT50",
      name: "Flat ₹50 off",
      type: DiscountType.FIXED,
      value: 50,
      minOrderAmount: 300,
      isActive: true,
    },
  });

  await prisma.appSetting.create({
    data: {
      key: "pos_category_order",
      value: JSON.stringify(["Beverages", "Snacks", "Breads", "Pizza", "Curry", "Rice"]),
    },
  });

  const periodMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  console.log("Creating expenses…");
  await prisma.expense.createMany({
    data: [
      {
        category: "RENT",
        description: "Shop rent",
        amount: 45000,
        periodMonth,
      },
      {
        category: "SALARIES",
        description: "Kitchen & counter staff",
        amount: 85000,
        periodMonth,
      },
      {
        category: "UTILITIES",
        description: "Electricity & gas",
        amount: 12000,
        periodMonth,
      },
      {
        category: "MARKETING",
        description: "Instagram ads",
        amount: 5000,
        periodMonth,
      },
    ],
  });

  console.log("Creating inventory purchases (payables)…");
  await prisma.inventoryPurchase.create({
    data: {
      inventoryItemId: s("All-Purpose Flour").id,
      supplierId: metro.id,
      description: "Monthly flour restock",
      supplier: metro.name,
      totalAmount: 8500,
      amountPaid: 8500,
      paymentStatus: PurchasePaymentStatus.PAID,
      purchaseDate: daysAgo(3),
    },
  });

  await prisma.inventoryPurchase.create({
    data: {
      supplierId: dairy.id,
      description: "Cheese & paneer delivery — on credit",
      supplier: dairy.name,
      totalAmount: 15000,
      amountPaid: 0,
      paymentStatus: PurchasePaymentStatus.CREDIT,
      purchaseDate: daysAgo(10),
      dueDate: daysAgo(-14),
      notes: "Net 30 terms",
    },
  });

  await prisma.inventoryPurchase.create({
    data: {
      inventoryItemId: s("Chicken Boneless").id,
      supplierId: metro.id,
      description: "Chicken bulk — partial payment",
      totalAmount: 12000,
      amountPaid: 5000,
      paymentStatus: PurchasePaymentStatus.PARTIAL,
      purchaseDate: daysAgo(7),
      dueDate: daysAgo(-7),
    },
  });

  async function createOrderWithLines(opts: {
    orderNumber: string;
    status: OrderStatus;
    createdAt: Date;
    customerId?: string;
    customerName?: string;
    discountId?: string;
    discountCode?: string;
    discountTotal?: number;
    paymentMethod?: OrderPaymentMethod;
    paidAt?: Date;
    processedAt?: Date;
    readyAt?: Date;
    deliveredAt?: Date;
    notes?: string;
    lines: { recipeName: string; qty: number; unitPrice: number; revenue: number; cost?: number }[];
  }) {
    const subtotal = opts.lines.reduce((sum, l) => sum + l.revenue, 0);
    const discountTotal = opts.discountTotal ?? 0;

    return prisma.order.create({
      data: {
        orderNumber: opts.orderNumber,
        status: opts.status,
        createdAt: opts.createdAt,
        customerId: opts.customerId,
        customerName: opts.customerName,
        discountId: opts.discountId,
        discountCode: opts.discountCode,
        subtotal,
        discountTotal,
        paymentMethod: opts.paymentMethod,
        paidAt: opts.paidAt,
        notes: opts.notes,
        processedAt: opts.processedAt,
        readyAt: opts.readyAt,
        deliveredAt: opts.deliveredAt,
        lineItems: {
          create: opts.lines.map((line) => {
            const recipe = recipeByName.get(line.recipeName)!;
            const cost = line.cost ?? line.revenue * 0.35;
            const profit = line.revenue - cost;
            const processed =
              opts.status === OrderStatus.READY || opts.status === OrderStatus.DELIVERED
                ? opts.readyAt ?? opts.processedAt ?? opts.createdAt
                : null;

            return {
              recipeId: recipe.id,
              recipeName: line.recipeName,
              quantity: line.qty,
              unitSalePrice: line.unitPrice,
              revenue: line.revenue,
              ingredientCost: cost,
              profit,
              processedAt: processed,
            };
          }),
        },
      },
    });
  }

  console.log("Creating sample orders…");

  // Delivered today — POS PhonePe (frequent buyer)
  await createOrderWithLines({
    orderNumber: orderNumber("100001"),
    status: OrderStatus.DELIVERED,
    createdAt: daysAgo(0),
    customerId: customerRajesh.id,
    paymentMethod: OrderPaymentMethod.PHONEPE,
    paidAt: daysAgo(0),
    processedAt: daysAgo(0),
    readyAt: daysAgo(0),
    deliveredAt: daysAgo(0),
    lines: [
      { recipeName: "Paneer Tikka Pizza", qty: 1, unitPrice: 349, revenue: 349, cost: 95 },
      { recipeName: "Masala Chai", qty: 2, unitPrice: 40, revenue: 80, cost: 18 },
    ],
  });

  // Delivered yesterday — Cash
  await createOrderWithLines({
    orderNumber: orderNumber("100002"),
    status: OrderStatus.DELIVERED,
    createdAt: daysAgo(1),
    customerId: customerPriya.id,
    paymentMethod: OrderPaymentMethod.CASH,
    paidAt: daysAgo(1),
    processedAt: daysAgo(1),
    readyAt: daysAgo(1),
    deliveredAt: daysAgo(1),
    lines: [
      { recipeName: "Chicken Biryani", qty: 2, unitPrice: 320, revenue: 640, cost: 210 },
      { recipeName: "Butter Naan", qty: 2, unitPrice: 45, revenue: 90, cost: 22 },
    ],
  });

  // Delivered 3 days ago — with discount
  await createOrderWithLines({
    orderNumber: orderNumber("100003"),
    status: OrderStatus.DELIVERED,
    createdAt: daysAgo(3),
    customerName: "Office lunch",
    discountId: discountWelcome.id,
    discountCode: "WELCOME10",
    discountTotal: 63.8,
    paymentMethod: OrderPaymentMethod.CARD,
    paidAt: daysAgo(3),
    processedAt: daysAgo(3),
    readyAt: daysAgo(3),
    deliveredAt: daysAgo(3),
    lines: [
      { recipeName: "Margherita Pizza", qty: 2, unitPrice: 299, revenue: 538.2, cost: 140 },
      { recipeName: "Cold Coffee", qty: 2, unitPrice: 120, revenue: 216, cost: 55 },
    ],
  });

  // Repeat history for Priya (5 days ago)
  await createOrderWithLines({
    orderNumber: orderNumber("100004"),
    status: OrderStatus.DELIVERED,
    createdAt: daysAgo(5),
    customerId: customerPriya.id,
    paymentMethod: OrderPaymentMethod.PHONEPE,
    paidAt: daysAgo(5),
    deliveredAt: daysAgo(5),
    processedAt: daysAgo(5),
    readyAt: daysAgo(5),
    lines: [{ recipeName: "Veg Biryani", qty: 1, unitPrice: 220, revenue: 220, cost: 65 }],
  });

  // Inactive customer — 35 days ago
  await createOrderWithLines({
    orderNumber: orderNumber("100005"),
    status: OrderStatus.DELIVERED,
    createdAt: daysAgo(35),
    customerId: customerAnil.id,
    paymentMethod: OrderPaymentMethod.CASH,
    paidAt: daysAgo(35),
    deliveredAt: daysAgo(35),
    processedAt: daysAgo(35),
    readyAt: daysAgo(35),
    lines: [{ recipeName: "Chicken Curry", qty: 1, unitPrice: 280, revenue: 280, cost: 90 }],
  });

  // More history for Rajesh (VIP)
  for (let i = 0; i < 8; i++) {
    await createOrderWithLines({
      orderNumber: orderNumber(`10${1006 + i}`),
      status: OrderStatus.DELIVERED,
      createdAt: daysAgo(7 + i * 3),
      customerId: customerRajesh.id,
      paymentMethod: i % 2 === 0 ? OrderPaymentMethod.PHONEPE : OrderPaymentMethod.CASH,
      paidAt: daysAgo(7 + i * 3),
      deliveredAt: daysAgo(7 + i * 3),
      processedAt: daysAgo(7 + i * 3),
      readyAt: daysAgo(7 + i * 3),
      lines: [
        {
          recipeName: i % 3 === 0 ? "Samosa (2 pcs)" : "Garlic Naan",
          qty: 2,
          unitPrice: i % 3 === 0 ? 60 : 50,
          revenue: i % 3 === 0 ? 120 : 100,
          cost: 30,
        },
      ],
    });
  }

  // Active pipeline orders
  await createOrderWithLines({
    orderNumber: orderNumber("200001"),
    status: OrderStatus.NEW,
    createdAt: new Date(),
    customerName: "Table 3",
    paymentMethod: OrderPaymentMethod.CARD,
    paidAt: new Date(),
    lines: [
      { recipeName: "Margherita Pizza", qty: 1, unitPrice: 299, revenue: 299 },
      { recipeName: "Masala Chai", qty: 1, unitPrice: 40, revenue: 40 },
    ],
  });

  await createOrderWithLines({
    orderNumber: orderNumber("200002"),
    status: OrderStatus.PROCESSING,
    createdAt: daysAgo(0),
    processedAt: new Date(),
    customerName: "Counter pickup",
    paymentMethod: OrderPaymentMethod.CASH,
    paidAt: daysAgo(0),
    lines: [{ recipeName: "Chicken Biryani", qty: 1, unitPrice: 320, revenue: 320 }],
  });

  await createOrderWithLines({
    orderNumber: orderNumber("200003"),
    status: OrderStatus.READY,
    createdAt: daysAgo(0),
    processedAt: daysAgo(0),
    readyAt: new Date(),
    lines: [
      { recipeName: "Paneer Tikka Pizza", qty: 1, unitPrice: 349, revenue: 349, cost: 95 },
      { recipeName: "Cold Coffee", qty: 1, unitPrice: 120, revenue: 120, cost: 28 },
    ],
  });

  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  for (const u of [
    { email: "admin@restaurant.com", name: "Admin", role: UserRole.OWNER },
    { email: "pos@restaurant.com", name: "POS Staff", role: UserRole.POS },
    { email: "kitchen@restaurant.com", name: "Kitchen Lead", role: UserRole.KITCHEN },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hashPassword(seedPassword),
      },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: hashPassword(seedPassword),
      },
    });
  }

  console.log(`
Seed complete — sample data ready:

  Suppliers:     3 (Metro Foods, Dairy Fresh, Green Valley)
  Ingredients:   ${ingMap.size}
  Inventory:     ${stockMap.size} SKUs (cheese is low-stock for alerts)
  Recipes:       ${recipeByName.size} with sale prices (₹) — try POS categories
  Customers:     4 (Rajesh VIP, Priya repeat, Anil inactive, walk-in)
  Discounts:     WELCOME10 (10%), FLAT50 (₹50 off)
  Expenses:      4 for current month (P&L)
  Purchases:     3 (paid, credit, partial → check Payables)
  Orders:        Pipeline (NEW/PROCESSING/READY) + delivered history for insights

  Team logins (password: ${seedPassword}):
  • admin@restaurant.com   — Admin (full access)
  • pos@restaurant.com     — POS register only
  • kitchen@restaurant.com — Kitchen display only

  Quick links:
  • POS register:     /orders/pos
  • Import data:      /admin/data
  • Orders board:     /orders
  • Recipe pricing:   /recipes/pricing
  • Payables:         /inventory/payables
  • Dashboard P&L:    /
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
