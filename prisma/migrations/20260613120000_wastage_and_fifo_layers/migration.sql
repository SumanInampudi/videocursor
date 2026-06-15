-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `wastagePercent` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `inventory_cost_layers` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantityRemaining` DECIMAL(12, 4) NOT NULL,
    `unit` ENUM('g', 'kg', 'ml', 'L', 'pcs', 'oz', 'lb') NOT NULL,
    `costPerUnit` DECIMAL(12, 4) NOT NULL,
    `receiveBatchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_cost_layers_inventoryItemId_createdAt_idx`(`inventoryItemId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_cost_layers` ADD CONSTRAINT `inventory_cost_layers_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one FIFO layer per item with on-hand stock (legacy stock before layers)
INSERT INTO `inventory_cost_layers` (`id`, `inventoryItemId`, `quantityRemaining`, `unit`, `costPerUnit`, `createdAt`)
SELECT
    CONCAT('legacy_', `id`),
    `id`,
    `quantity`,
    `unit`,
    `costPerUnit`,
    COALESCE(`updatedAt`, `createdAt`)
FROM `inventory_items`
WHERE `quantity` > 0;
