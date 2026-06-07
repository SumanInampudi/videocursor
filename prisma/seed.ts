import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const BUSINESS_ID = "default-business";

async function clearTransactionalData() {
  await prisma.orderLineConsumption.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.tableReservation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryPurchase.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.inventoryCostHistory.deleteMany();
  await prisma.inventoryCostLayer.deleteMany();
  await prisma.productIngredient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.userBusiness.deleteMany();
  await prisma.user.deleteMany();
  await prisma.diningTable.deleteMany();
  await prisma.business.deleteMany();
}

async function main() {
  console.log("Resetting database to empty venue (no catalog or orders)…");
  await clearTransactionalData();

  await prisma.business.create({
    data: {
      id: BUSINESS_ID,
      name: "My Restaurant",
      slug: "demo",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });

  for (let i = 1; i <= 12; i++) {
    await prisma.diningTable.create({
      data: {
        businessId: BUSINESS_ID,
        code: String(i),
        label: `Table ${i}`,
        section: i <= 8 ? "Main" : "Patio",
        sortOrder: i,
      },
    });
  }

  const venueKeys = [
    ["pos_enable_dine_in", "true"],
    ["pos_enable_online", "true"],
    ["pos_require_table_dine_in", "true"],
    ["pos_default_channel", "DINE_IN"],
  ] as const;

  for (const [key, value] of venueKeys) {
    await prisma.appSetting.create({ data: { businessId: BUSINESS_ID, key, value } });
  }

  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const users = [
    { email: "admin@restaurant.com", name: "Admin", role: UserRole.OWNER },
    { email: "pos@restaurant.com", name: "POS Staff", role: UserRole.POS },
    { email: "kitchen@restaurant.com", name: "Kitchen Lead", role: UserRole.KITCHEN },
    { email: "counter@restaurant.com", name: "Counter Staff", role: UserRole.COUNTER },
  ] as const;

  for (const u of users) {
    const user = await prisma.user.upsert({
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

    await prisma.userBusiness.upsert({
      where: {
        userId_businessId: { userId: user.id, businessId: BUSINESS_ID },
      },
      create: {
        userId: user.id,
        businessId: BUSINESS_ID,
        role: u.role,
      },
      update: { role: u.role },
    });
  }

  console.log(`
Seed complete — empty venue ready for manual setup:

  Business:      My Restaurant (slug: demo)
  Dining tables: 12
  Raw materials: (none — add at /raw-materials)
  Inventory:     (none — receive stock at /inventory/receive)
  Products:      (none — add at /products)
  Orders:        (none)

  Team logins (password: ${seedPassword}):
  • admin@restaurant.com   — full access
  • pos@restaurant.com     — POS register only
  • kitchen@restaurant.com — kitchen display only
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
