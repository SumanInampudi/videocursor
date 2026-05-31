-- Snapshot recipe name on order lines so recipes can be deleted without losing order history
ALTER TABLE `order_line_items` ADD COLUMN `recipeName` VARCHAR(191) NULL;

UPDATE `order_line_items` oli
INNER JOIN `recipes` r ON oli.`recipeId` = r.`id`
SET oli.`recipeName` = r.`name`;

ALTER TABLE `order_line_items` MODIFY `recipeName` VARCHAR(191) NOT NULL;

ALTER TABLE `order_line_items` DROP FOREIGN KEY `order_line_items_recipeId_fkey`;

ALTER TABLE `order_line_items` MODIFY `recipeId` VARCHAR(191) NULL;

ALTER TABLE `order_line_items` ADD CONSTRAINT `order_line_items_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
