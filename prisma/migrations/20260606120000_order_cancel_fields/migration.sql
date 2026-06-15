-- Order cancellation metadata
ALTER TABLE `orders` ADD COLUMN `cancelledAt` DATETIME(3) NULL;
ALTER TABLE `orders` ADD COLUMN `cancelReason` TEXT NULL;
