-- CreateTable
CREATE TABLE `ingredients` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `defaultUnit` ENUM('g', 'kg', 'ml', 'L', 'pcs', 'oz', 'lb') NOT NULL,
    `aliases` TEXT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ingredients_normalizedName_key`(`normalizedName`),
    UNIQUE INDEX `ingredients_sku_key`(`sku`),
    INDEX `ingredients_category_idx`(`category`),
    INDEX `ingredients_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve existing inventory as master ingredients.
INSERT INTO `ingredients` (`id`, `name`, `normalizedName`, `sku`, `category`, `defaultUnit`, `isActive`, `createdAt`, `updatedAt`)
SELECT
    UUID() AS `id`,
    MIN(`name`) AS `name`,
    LOWER(TRIM(`name`)) AS `normalizedName`,
    CONCAT('ING-MIG-', MIN(`sku`)) AS `sku`,
    MIN(`category`) AS `category`,
    MIN(`unit`) AS `defaultUnit`,
    true AS `isActive`,
    CURRENT_TIMESTAMP(3) AS `createdAt`,
    CURRENT_TIMESTAMP(3) AS `updatedAt`
FROM `inventory_items`
GROUP BY LOWER(TRIM(`name`));

-- AlterTable
ALTER TABLE `inventory_items` ADD COLUMN `ingredientId` VARCHAR(191) NULL;

-- Backfill inventory links.
UPDATE `inventory_items` AS `item`
INNER JOIN `ingredients` AS `ingredient`
    ON `ingredient`.`normalizedName` = LOWER(TRIM(`item`.`name`))
SET `item`.`ingredientId` = `ingredient`.`id`;

-- Alter recipe ingredients to point at the master ingredient.
ALTER TABLE `recipe_ingredients` DROP FOREIGN KEY `recipe_ingredients_inventoryItemId_fkey`;
ALTER TABLE `recipe_ingredients` ADD COLUMN `ingredientId` VARCHAR(191) NULL;

UPDATE `recipe_ingredients` AS `recipeIngredient`
INNER JOIN `inventory_items` AS `item`
    ON `recipeIngredient`.`inventoryItemId` = `item`.`id`
SET `recipeIngredient`.`ingredientId` = `item`.`ingredientId`;

ALTER TABLE `recipe_ingredients` MODIFY `ingredientId` VARCHAR(191) NOT NULL;
ALTER TABLE `recipe_ingredients` MODIFY `inventoryItemId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `inventory_items_ingredientId_idx` ON `inventory_items`(`ingredientId`);
CREATE INDEX `recipe_ingredients_ingredientId_idx` ON `recipe_ingredients`(`ingredientId`);

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
