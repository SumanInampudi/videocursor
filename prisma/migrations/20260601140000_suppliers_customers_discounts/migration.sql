-- CreateTable suppliers
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `suppliers_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable customers
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable discounts
CREATE TABLE `discounts` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL,
    `minOrderAmount` DECIMAL(12, 4) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `validFrom` DATE NULL,
    `validTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `discounts_code_key`(`code`),
    INDEX `discounts_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable inventory_items
ALTER TABLE `inventory_items` ADD COLUMN `supplierId` VARCHAR(191) NULL;
CREATE INDEX `inventory_items_supplierId_idx` ON `inventory_items`(`supplierId`);
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable inventory_purchases
ALTER TABLE `inventory_purchases` ADD COLUMN `supplierId` VARCHAR(191) NULL;
CREATE INDEX `inventory_purchases_supplierId_idx` ON `inventory_purchases`(`supplierId`);
ALTER TABLE `inventory_purchases` ADD CONSTRAINT `inventory_purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable orders
ALTER TABLE `orders` ADD COLUMN `customerId` VARCHAR(191) NULL,
    ADD COLUMN `discountId` VARCHAR(191) NULL,
    ADD COLUMN `discountCode` VARCHAR(191) NULL,
    ADD COLUMN `subtotal` DECIMAL(12, 4) NULL,
    ADD COLUMN `discountTotal` DECIMAL(12, 4) NOT NULL DEFAULT 0;

CREATE INDEX `orders_customerId_idx` ON `orders`(`customerId`);
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `orders_discountId_fkey` FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
