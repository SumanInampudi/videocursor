-- CreateTable inventory purchases (paid vs credit from suppliers)
CREATE TABLE `inventory_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `supplier` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(12, 4) NOT NULL,
    `amountPaid` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `paymentStatus` ENUM('PAID', 'CREDIT', 'PARTIAL') NOT NULL DEFAULT 'PAID',
    `purchaseDate` DATE NOT NULL,
    `dueDate` DATE NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_purchases_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `inventory_purchases_paymentStatus_idx`(`paymentStatus`),
    INDEX `inventory_purchases_purchaseDate_idx`(`purchaseDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_purchases` ADD CONSTRAINT `inventory_purchases_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
