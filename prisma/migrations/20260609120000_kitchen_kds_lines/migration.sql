-- Kitchen KDS: per-line done tracking, new-item bumps, cook acknowledge
ALTER TABLE `orders`
  ADD COLUMN `kitchenAcknowledgedAt` DATETIME(3) NULL,
  ADD COLUMN `kitchenBumpedAt` DATETIME(3) NULL;

ALTER TABLE `order_line_items`
  ADD COLUMN `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `kitchenDoneAt` DATETIME(3) NULL;

-- Backfill line addedAt from parent order
UPDATE `order_line_items` oli
INNER JOIN `orders` o ON o.id = oli.orderId
SET oli.addedAt = o.createdAt;
