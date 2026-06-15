-- Add PACKING stage and packingAt timestamp

ALTER TABLE `orders` ADD COLUMN `packingAt` DATETIME(3) NULL;

ALTER TABLE `orders` MODIFY COLUMN `status` ENUM(
  'NEW',
  'PROCESSING',
  'PACKING',
  'READY',
  'DELIVERED',
  'CANCELLED'
) NOT NULL DEFAULT 'NEW';
