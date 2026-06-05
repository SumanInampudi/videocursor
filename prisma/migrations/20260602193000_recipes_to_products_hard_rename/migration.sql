-- Hard rename recipes -> products
-- Keep data intact by renaming tables/columns and recreating dependent constraints/indexes.

-- order_line_items -> drop FK/index tied to recipeId
ALTER TABLE `order_line_items` DROP FOREIGN KEY `order_line_items_recipeId_fkey`;
DROP INDEX `order_line_items_recipeId_idx` ON `order_line_items`;

-- recipe_ingredients -> drop FKs/indexes tied to recipe naming
ALTER TABLE `recipe_ingredients` DROP FOREIGN KEY `recipe_ingredients_recipeId_fkey`;
DROP INDEX `recipe_ingredients_recipeId_idx` ON `recipe_ingredients`;

-- recipes -> drop retail and business FKs / indexes that include recipe naming
ALTER TABLE `recipes` DROP FOREIGN KEY `recipes_businessId_fkey`;
ALTER TABLE `recipes` DROP FOREIGN KEY `recipes_retailInventoryItemId_fkey`;
DROP INDEX `recipes_businessId_category_idx` ON `recipes`;
DROP INDEX `recipes_businessId_recipeType_idx` ON `recipes`;
DROP INDEX `recipes_retailInventoryItemId_idx` ON `recipes`;

-- rename core recipe tables
RENAME TABLE `recipes` TO `products`;
RENAME TABLE `recipe_ingredients` TO `product_ingredients`;

-- rename recipe columns
ALTER TABLE `products`
  CHANGE COLUMN `recipeType` `productType` ENUM('PREPARED', 'RETAIL') NOT NULL DEFAULT 'PREPARED';

ALTER TABLE `product_ingredients`
  CHANGE COLUMN `recipeId` `productId` VARCHAR(191) NOT NULL;

ALTER TABLE `order_line_items`
  CHANGE COLUMN `recipeId` `productId` VARCHAR(191) NULL,
  CHANGE COLUMN `recipeName` `productName` VARCHAR(191) NOT NULL;

-- recreate indexes
CREATE INDEX `products_businessId_category_idx` ON `products`(`businessId`, `category`);
CREATE INDEX `products_businessId_productType_idx` ON `products`(`businessId`, `productType`);
CREATE INDEX `products_retailInventoryItemId_idx` ON `products`(`retailInventoryItemId`);
CREATE INDEX `product_ingredients_productId_idx` ON `product_ingredients`(`productId`);
CREATE INDEX `order_line_items_productId_idx` ON `order_line_items`(`productId`);

-- recreate foreign keys
ALTER TABLE `products`
  ADD CONSTRAINT `products_businessId_fkey`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_retailInventoryItemId_fkey`
    FOREIGN KEY (`retailInventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `product_ingredients`
  ADD CONSTRAINT `product_ingredients_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_line_items`
  ADD CONSTRAINT `order_line_items_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

