-- AlterTable recipes: sale price and barcode
ALTER TABLE `recipes` ADD COLUMN `salePrice` DECIMAL(12, 4) NULL;
ALTER TABLE `recipes` ADD COLUMN `barcode` VARCHAR(191) NULL;

-- Backfill barcodes for existing recipes (internal prefix 2 + id suffix)
UPDATE `recipes` SET `barcode` = CONCAT('2', RIGHT(REPLACE(`id`, '-', ''), 12)) WHERE `barcode` IS NULL;

ALTER TABLE `recipes` MODIFY `barcode` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `recipes_barcode_key` ON `recipes`(`barcode`);

-- Inventory cost history
CREATE TABLE `inventory_cost_history` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `costPerUnit` DECIMAL(12, 4) NOT NULL,
    `previousCost` DECIMAL(12, 4) NULL,
    `effectiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,

    INDEX `inventory_cost_history_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `inventory_cost_history_effectiveAt_idx`(`effectiveAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_cost_history` ADD CONSTRAINT `inventory_cost_history_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Orders
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `status` ENUM('NEW', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `readyAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_line_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitSalePrice` DECIMAL(12, 4) NOT NULL,
    `ingredientCost` DECIMAL(12, 4) NULL,
    `revenue` DECIMAL(12, 4) NULL,
    `profit` DECIMAL(12, 4) NULL,
    `processedAt` DATETIME(3) NULL,

    INDEX `order_line_items_orderId_idx`(`orderId`),
    INDEX `order_line_items_recipeId_idx`(`recipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_line_consumptions` (
    `id` VARCHAR(191) NOT NULL,
    `orderLineItemId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantityDeducted` DECIMAL(12, 4) NOT NULL,
    `unit` ENUM('g', 'kg', 'ml', 'L', 'pcs', 'oz', 'lb') NOT NULL,
    `costPerUnit` DECIMAL(12, 4) NOT NULL,
    `lineCost` DECIMAL(12, 4) NOT NULL,

    INDEX `order_line_consumptions_orderLineItemId_idx`(`orderLineItemId`),
    INDEX `order_line_consumptions_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `order_line_items` ADD CONSTRAINT `order_line_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `order_line_items` ADD CONSTRAINT `order_line_items_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `order_line_consumptions` ADD CONSTRAINT `order_line_consumptions_orderLineItemId_fkey` FOREIGN KEY (`orderLineItemId`) REFERENCES `order_line_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `order_line_consumptions` ADD CONSTRAINT `order_line_consumptions_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
