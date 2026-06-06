-- Phase 2: item-level promos, targeting, schedules

ALTER TABLE `discounts`
  MODIFY `kind` ENUM('CHECK_PERCENT', 'CHECK_FIXED', 'ITEM_PERCENT', 'ITEM_FIXED') NOT NULL,
  ADD COLUMN `scheduleJson` JSON NOT NULL DEFAULT ('{}') AFTER `redemptionCount`,
  ADD COLUMN `channelsJson` JSON NOT NULL DEFAULT ('[]') AFTER `scheduleJson`;

ALTER TABLE `order_applied_promotions`
  MODIFY `kind` ENUM('CHECK_PERCENT', 'CHECK_FIXED', 'ITEM_PERCENT', 'ITEM_FIXED') NOT NULL;

CREATE TABLE `promotion_targets` (
  `id` VARCHAR(191) NOT NULL,
  `discountId` VARCHAR(191) NOT NULL,
  `targetType` ENUM('ALL_PRODUCTS', 'PRODUCT', 'CATEGORY') NOT NULL,
  `productId` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,

  INDEX `promotion_targets_discountId_idx`(`discountId`),
  INDEX `promotion_targets_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `promotion_targets`
  ADD CONSTRAINT `promotion_targets_discountId_fkey`
    FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `promotion_targets_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
