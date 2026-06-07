-- Sell variants: POS packs linked to a prep batch (Single Plate, Family Pack, etc.)

ALTER TABLE `products` ADD COLUMN `parentPrepId` VARCHAR(191) NULL;
ALTER TABLE `products` ADD COLUMN `variantLabel` VARCHAR(191) NULL;
ALTER TABLE `products` ADD COLUMN `variantSortOrder` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `products` ADD COLUMN `variantOutputQuantity` DECIMAL(12, 4) NULL;

CREATE INDEX `products_parentPrepId_idx` ON `products`(`parentPrepId`);

ALTER TABLE `products` ADD CONSTRAINT `products_parentPrepId_fkey`
  FOREIGN KEY (`parentPrepId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
