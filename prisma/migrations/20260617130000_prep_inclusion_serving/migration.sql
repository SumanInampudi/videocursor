-- Prep batch output amount consumed per inclusion unit (free side with a parent dish).
ALTER TABLE `products` ADD COLUMN `inclusionOutputQuantity` DECIMAL(12, 4) NULL;
