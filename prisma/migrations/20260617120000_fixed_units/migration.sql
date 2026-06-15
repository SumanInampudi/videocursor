-- Migrate legacy unit values to fixed set: KG, GM, LT, ML, Pcs

ALTER TABLE `ingredients` MODIFY `defaultUnit` VARCHAR(10) NOT NULL;
ALTER TABLE `inventory_items` MODIFY `unit` VARCHAR(10) NOT NULL;
ALTER TABLE `inventory_cost_layers` MODIFY `unit` VARCHAR(10) NOT NULL;
ALTER TABLE `product_ingredients` MODIFY `unit` VARCHAR(10) NOT NULL;
ALTER TABLE `order_line_consumptions` MODIFY `unit` VARCHAR(10) NOT NULL;

UPDATE `ingredients` SET `defaultUnit` = CASE `defaultUnit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `defaultUnit`
END;

UPDATE `inventory_items` SET `unit` = CASE `unit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `unit`
END;

UPDATE `inventory_cost_layers` SET `unit` = CASE `unit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `unit`
END;

UPDATE `product_ingredients` SET `unit` = CASE `unit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `unit`
END;

UPDATE `order_line_consumptions` SET `unit` = CASE `unit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `unit`
END;

UPDATE `products` SET `yieldUnit` = CASE `yieldUnit`
  WHEN 'kg' THEN 'KG'
  WHEN 'g' THEN 'GM'
  WHEN 'ml' THEN 'ML'
  WHEN 'L' THEN 'LT'
  WHEN 'pcs' THEN 'Pcs'
  WHEN 'oz' THEN 'GM'
  WHEN 'lb' THEN 'KG'
  ELSE `yieldUnit`
END;

ALTER TABLE `ingredients` MODIFY `defaultUnit` ENUM('KG', 'GM', 'LT', 'ML', 'Pcs') NOT NULL;
ALTER TABLE `inventory_items` MODIFY `unit` ENUM('KG', 'GM', 'LT', 'ML', 'Pcs') NOT NULL;
ALTER TABLE `inventory_cost_layers` MODIFY `unit` ENUM('KG', 'GM', 'LT', 'ML', 'Pcs') NOT NULL;
ALTER TABLE `product_ingredients` MODIFY `unit` ENUM('KG', 'GM', 'LT', 'ML', 'Pcs') NOT NULL;
ALTER TABLE `order_line_consumptions` MODIFY `unit` ENUM('KG', 'GM', 'LT', 'ML', 'Pcs') NOT NULL;
