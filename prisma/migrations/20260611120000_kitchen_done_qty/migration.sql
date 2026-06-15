-- Track how many units the cook marked done (qty bumps don't reset whole line)
ALTER TABLE `order_line_items`
  ADD COLUMN `kitchenDoneQty` INT NOT NULL DEFAULT 0;

UPDATE `order_line_items`
SET `kitchenDoneQty` = `quantity`
WHERE `kitchenDoneAt` IS NOT NULL;
