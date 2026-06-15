-- Phase 1: Promotion foundation — extend discounts, add audit tables

ALTER TABLE `discounts`
  ADD COLUMN `kind` ENUM('CHECK_PERCENT', 'CHECK_FIXED') NULL AFTER `name`,
  ADD COLUMN `application` ENUM('CODE', 'AUTO', 'MANAGER') NOT NULL DEFAULT 'CODE' AFTER `kind`,
  ADD COLUMN `scope` ENUM('ORDER', 'LINE', 'BUNDLE') NOT NULL DEFAULT 'ORDER' AFTER `application`,
  ADD COLUMN `stackingPolicy` ENUM('EXCLUSIVE', 'STACKABLE', 'BEST_PRICE') NOT NULL DEFAULT 'EXCLUSIVE' AFTER `scope`,
  ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 100 AFTER `stackingPolicy`,
  ADD COLUMN `maxDiscountAmount` DECIMAL(12, 4) NULL AFTER `minOrderAmount`,
  ADD COLUMN `redemptionCount` INTEGER NOT NULL DEFAULT 0 AFTER `validTo`,
  ADD COLUMN `configJson` JSON NOT NULL AFTER `redemptionCount`;

UPDATE `discounts`
SET `kind` = IF(`type` = 'PERCENT', 'CHECK_PERCENT', 'CHECK_FIXED');

ALTER TABLE `discounts`
  DROP COLUMN `type`,
  MODIFY `kind` ENUM('CHECK_PERCENT', 'CHECK_FIXED') NOT NULL;

CREATE TABLE `order_applied_promotions` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `discountId` VARCHAR(191) NULL,
  `kind` ENUM('CHECK_PERCENT', 'CHECK_FIXED') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NULL,
  `discountAmount` DECIMAL(12, 4) NOT NULL,
  `configSnapshot` JSON NOT NULL,
  `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `order_applied_promotions_orderId_idx`(`orderId`),
  INDEX `order_applied_promotions_discountId_idx`(`discountId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_line_discounts` (
  `id` VARCHAR(191) NOT NULL,
  `orderAppliedPromotionId` VARCHAR(191) NOT NULL,
  `orderLineItemId` VARCHAR(191) NOT NULL,
  `discountAmount` DECIMAL(12, 4) NOT NULL,
  `grossRevenue` DECIMAL(12, 4) NOT NULL,
  `netRevenue` DECIMAL(12, 4) NOT NULL,

  INDEX `order_line_discounts_orderAppliedPromotionId_idx`(`orderAppliedPromotionId`),
  INDEX `order_line_discounts_orderLineItemId_idx`(`orderLineItemId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `order_applied_promotions`
  ADD CONSTRAINT `order_applied_promotions_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `order_applied_promotions_discountId_fkey`
    FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `order_line_discounts`
  ADD CONSTRAINT `order_line_discounts_orderAppliedPromotionId_fkey`
    FOREIGN KEY (`orderAppliedPromotionId`) REFERENCES `order_applied_promotions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `order_line_discounts_orderLineItemId_fkey`
    FOREIGN KEY (`orderLineItemId`) REFERENCES `order_line_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
