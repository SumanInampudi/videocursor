-- POS / register payment tracking on orders
ALTER TABLE `orders` ADD COLUMN `paymentMethod` ENUM('CASH', 'CARD', 'PHONEPE') NULL;
ALTER TABLE `orders` ADD COLUMN `paidAt` DATETIME(3) NULL;
