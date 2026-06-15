-- Idempotent recipes -> products rename (runs after all recipe column migrations)

SET @db := DATABASE();
SET @recipes_exists := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db AND table_name = 'recipes'
);
SET @products_exists := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db AND table_name = 'products'
);

-- Skip when already renamed
SET @run := IF(@recipes_exists > 0 AND @products_exists = 0, 1, 0);

-- order_line_items: drop recipe FK if present
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'order_line_items'
      AND CONSTRAINT_NAME = 'order_line_items_recipeId_fkey'
  ) > 0,
  'ALTER TABLE `order_line_items` DROP FOREIGN KEY `order_line_items_recipeId_fkey`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'order_line_items'
      AND index_name = 'order_line_items_recipeId_idx'
  ) > 0,
  'DROP INDEX `order_line_items_recipeId_idx` ON `order_line_items`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- recipe_ingredients FK
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'recipe_ingredients'
      AND CONSTRAINT_NAME = 'recipe_ingredients_recipeId_fkey'
  ) > 0,
  'ALTER TABLE `recipe_ingredients` DROP FOREIGN KEY `recipe_ingredients_recipeId_fkey`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'recipe_ingredients'
      AND index_name = 'recipe_ingredients_recipeId_idx'
  ) > 0,
  'DROP INDEX `recipe_ingredients_recipeId_idx` ON `recipe_ingredients`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- recipes FKs / indexes (only if they exist)
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'recipes'
      AND CONSTRAINT_NAME = 'recipes_businessId_fkey'
  ) > 0,
  'ALTER TABLE `recipes` DROP FOREIGN KEY `recipes_businessId_fkey`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'recipes'
      AND CONSTRAINT_NAME = 'recipes_retailInventoryItemId_fkey'
  ) > 0,
  'ALTER TABLE `recipes` DROP FOREIGN KEY `recipes_retailInventoryItemId_fkey`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'recipes'
      AND index_name = 'recipes_businessId_category_idx'
  ) > 0,
  'DROP INDEX `recipes_businessId_category_idx` ON `recipes`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'recipes'
      AND index_name = 'recipes_businessId_recipeType_idx'
  ) > 0,
  'DROP INDEX `recipes_businessId_recipeType_idx` ON `recipes`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'recipes'
      AND index_name = 'recipes_retailInventoryItemId_idx'
  ) > 0,
  'DROP INDEX `recipes_retailInventoryItemId_idx` ON `recipes`',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Rename tables
SET @sql := IF(@run = 1, 'RENAME TABLE `recipes` TO `products`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(@run = 1, 'RENAME TABLE `recipe_ingredients` TO `product_ingredients`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Rename columns (only when old names still exist)
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'recipeType'
  ) > 0,
  'ALTER TABLE `products` CHANGE COLUMN `recipeType` `productType` ENUM(''PREPARED'', ''RETAIL'') NOT NULL DEFAULT ''PREPARED''',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'product_ingredients' AND column_name = 'recipeId'
  ) > 0,
  'ALTER TABLE `product_ingredients` CHANGE COLUMN `recipeId` `productId` VARCHAR(191) NOT NULL',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'order_line_items' AND column_name = 'recipeId'
  ) > 0,
  'ALTER TABLE `order_line_items` CHANGE COLUMN `recipeId` `productId` VARCHAR(191) NULL, CHANGE COLUMN `recipeName` `productName` VARCHAR(191) NOT NULL',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Recreate indexes (ignore if exist — use dynamic checks)
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'products'
      AND index_name = 'products_businessId_category_idx'
  ) = 0,
  'CREATE INDEX `products_businessId_category_idx` ON `products`(`businessId`, `category`)',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'products'
      AND index_name = 'products_businessId_productType_idx'
  ) = 0,
  'CREATE INDEX `products_businessId_productType_idx` ON `products`(`businessId`, `productType`)',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'products'
      AND index_name = 'products_retailInventoryItemId_idx'
  ) = 0,
  'CREATE INDEX `products_retailInventoryItemId_idx` ON `products`(`retailInventoryItemId`)',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'product_ingredients'
      AND index_name = 'product_ingredients_productId_idx'
  ) = 0,
  'CREATE INDEX `product_ingredients_productId_idx` ON `product_ingredients`(`productId`)',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'order_line_items'
      AND index_name = 'order_line_items_productId_idx'
  ) = 0,
  'CREATE INDEX `order_line_items_productId_idx` ON `order_line_items`(`productId`)',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Recreate FKs
SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'products_businessId_fkey'
  ) = 0,
  'ALTER TABLE `products` ADD CONSTRAINT `products_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'products_retailInventoryItemId_fkey'
  ) = 0,
  'ALTER TABLE `products` ADD CONSTRAINT `products_retailInventoryItemId_fkey` FOREIGN KEY (`retailInventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'product_ingredients'
      AND CONSTRAINT_NAME = 'product_ingredients_productId_fkey'
  ) = 0,
  'ALTER TABLE `product_ingredients` ADD CONSTRAINT `product_ingredients_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  @run = 1 AND (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'order_line_items'
      AND CONSTRAINT_NAME = 'order_line_items_productId_fkey'
  ) = 0,
  'ALTER TABLE `order_line_items` ADD CONSTRAINT `order_line_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
