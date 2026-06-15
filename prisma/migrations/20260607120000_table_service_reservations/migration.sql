-- Dine-in table service: guest covers on orders + reservations

ALTER TABLE `orders` ADD COLUMN `covers` INTEGER NULL;

CREATE TABLE `table_reservations` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `diningTableId` VARCHAR(191) NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `partySize` INTEGER NOT NULL DEFAULT 2,
    `reservedAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 90,
    `status` ENUM('PENDING', 'SEATED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `orderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `table_reservations_orderId_key`(`orderId`),
    INDEX `table_reservations_businessId_reservedAt_idx`(`businessId`, `reservedAt`),
    INDEX `table_reservations_businessId_status_idx`(`businessId`, `status`),
    INDEX `table_reservations_diningTableId_idx`(`diningTableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_diningTableId_fkey` FOREIGN KEY (`diningTableId`) REFERENCES `dining_tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `app_settings` (`id`, `businessId`, `key`, `value`, `updatedAt`)
SELECT CONCAT('vs-pay-timing-', b.id), b.id, 'pos_dine_in_payment_timing', 'at_close', NOW(3)
FROM `businesses` b
WHERE NOT EXISTS (
  SELECT 1 FROM `app_settings` s
  WHERE s.`businessId` = b.id AND s.`key` = 'pos_dine_in_payment_timing'
);
