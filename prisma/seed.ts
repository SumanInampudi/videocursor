import { PrismaClient, Unit } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.inventoryItem.deleteMany();

  const flour = await prisma.inventoryItem.create({
    data: {
      name: "All-Purpose Flour",
      sku: "FLR-001",
      category: "Dry Goods",
      description: "High-quality all-purpose flour for baking and pizza dough",
      quantity: 5000,
      unit: Unit.g,
      reorderLevel: 1000,
      costPerUnit: 0.002,
      supplier: "Metro Foods",
      storageLocation: "Dry Storage A1",
      isActive: true,
    },
  });

  const cheese = await prisma.inventoryItem.create({
    data: {
      name: "Mozzarella Cheese",
      sku: "CHZ-001",
      category: "Dairy",
      description: "Fresh mozzarella for pizzas and pasta",
      quantity: 250,
      unit: Unit.g,
      reorderLevel: 500,
      costPerUnit: 0.015,
      supplier: "Dairy Fresh Co",
      storageLocation: "Cold Storage B2",
      isActive: true,
    },
  });

  const chicken = await prisma.inventoryItem.create({
    data: {
      name: "Chicken Breast",
      sku: "MT-001",
      category: "Meat",
      description: "Boneless skinless chicken breast",
      quantity: 3000,
      unit: Unit.g,
      reorderLevel: 1000,
      costPerUnit: 0.012,
      supplier: "Farm Direct",
      storageLocation: "Cold Storage A1",
      isActive: true,
    },
  });

  const rice = await prisma.inventoryItem.create({
    data: {
      name: "Basmati Rice",
      sku: "RCE-001",
      category: "Dry Goods",
      description: "Premium basmati rice",
      quantity: 2000,
      unit: Unit.g,
      reorderLevel: 500,
      costPerUnit: 0.003,
      supplier: "Metro Foods",
      storageLocation: "Dry Storage A2",
      isActive: true,
    },
  });

  const tomatoes = await prisma.inventoryItem.create({
    data: {
      name: "Fresh Tomatoes",
      sku: "VEG-001",
      category: "Produce",
      description: "Ripe fresh tomatoes for sauces and toppings",
      quantity: 1500,
      unit: Unit.g,
      reorderLevel: 300,
      costPerUnit: 0.004,
      supplier: "Green Valley Farms",
      storageLocation: "Cold Storage C1",
      isActive: true,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      name: "Olive Oil",
      sku: "OIL-001",
      category: "Oils",
      description: "Extra virgin olive oil",
      quantity: 2000,
      unit: Unit.ml,
      reorderLevel: 500,
      costPerUnit: 0.008,
      supplier: "Mediterranean Imports",
      storageLocation: "Dry Storage B1",
      isActive: true,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      name: "Sea Salt",
      sku: "SPC-001",
      category: "Spices",
      description: "Fine sea salt",
      quantity: 500,
      unit: Unit.g,
      reorderLevel: 100,
      costPerUnit: 0.001,
      supplier: "Spice World",
      storageLocation: "Dry Storage C1",
      isActive: true,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      name: "Active Dry Yeast",
      sku: "BAK-001",
      category: "Baking",
      description: "Active dry yeast for bread and pizza dough",
      quantity: 200,
      unit: Unit.g,
      reorderLevel: 50,
      costPerUnit: 0.02,
      supplier: "Baker's Supply",
      storageLocation: "Dry Storage A1",
      isActive: true,
    },
  });

  await prisma.recipe.create({
    data: {
      name: "Margherita Pizza",
      description: "Classic margherita pizza with fresh mozzarella and tomatoes",
      category: "Pizza",
      yieldQuantity: 1,
      yieldUnit: "pizza",
      instructions: "Prepare dough, add sauce, cheese, and bake at 450°F for 12 minutes.",
      ingredients: {
        create: [
          {
            inventoryItemId: flour.id,
            quantityRequired: 200,
            unit: Unit.g,
          },
          {
            inventoryItemId: cheese.id,
            quantityRequired: 100,
            unit: Unit.g,
          },
          {
            inventoryItemId: tomatoes.id,
            quantityRequired: 50,
            unit: Unit.g,
          },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      name: "Chicken Curry",
      description: "Spiced chicken curry served with basmati rice",
      category: "Curry",
      yieldQuantity: 4,
      yieldUnit: "portions",
      instructions: "Cook chicken with spices, serve over rice.",
      ingredients: {
        create: [
          {
            inventoryItemId: chicken.id,
            quantityRequired: 500,
            unit: Unit.g,
          },
          {
            inventoryItemId: rice.id,
            quantityRequired: 200,
            unit: Unit.g,
          },
          {
            inventoryItemId: tomatoes.id,
            quantityRequired: 100,
            unit: Unit.g,
          },
        ],
      },
    },
  });

  console.log("Seed data created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
