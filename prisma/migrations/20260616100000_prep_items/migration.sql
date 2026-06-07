-- Prep items (house-made batches) + production log

ALTER TABLE `products` MODIFY `productType` ENUM('PREPARED', 'RETAIL', 'PREP') NOT NULL DEFAULT 'PREPARED';

ALTER TABLE `products` ADD COLUMN `prepOutputInventoryItemId` VARCHAR(191) NULL;

CREATE INDEX `products_prepOutputInventoryItemId_idx` ON `products`(`prepOutputInventoryItemId`);

ALTER TABLE `products` ADD CONSTRAINT `products_prepOutputInventoryItemId_fkey` FOREIGN KEY (`prepOutputInventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `prep_batches` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `prepProductId` VARCHAR(191) NOT NULL,
    `outputInventoryItemId` VARCHAR(191) NOT NULL,
    `quantityProduced` DECIMAL(12, 4) NOT NULL,
    `totalInputCost` DECIMAL(12, 4) NOT NULL,
    `costPerUnit` DECIMAL(12, 4) NOT NULL,
    `note` TEXT NULL,
    `producedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prep_batches_businessId_producedAt_idx`(`businessId`, `producedAt`),
    INDEX `prep_batches_prepProductId_idx`(`prepProductId`),
    INDEX `prep_batches_outputInventoryItemId_idx`(`outputInventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `prep_batches` ADD CONSTRAINT `prep_batches_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `prep_batches` ADD CONSTRAINT `prep_batches_prepProductId_fkey` FOREIGN KEY (`prepProductId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `prep_batches` ADD CONSTRAINT `prep_batches_outputInventoryItemId_fkey` FOREIGN KEY (`outputInventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
