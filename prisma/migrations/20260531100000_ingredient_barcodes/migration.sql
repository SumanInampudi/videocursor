-- AlterTable ingredients: barcode for scanner input
ALTER TABLE `ingredients` ADD COLUMN `barcode` VARCHAR(191) NULL;

-- Backfill (prefix 3 = ingredient)
UPDATE `ingredients` SET `barcode` = CONCAT('3', RIGHT(REPLACE(`id`, '-', ''), 12)) WHERE `barcode` IS NULL;

ALTER TABLE `ingredients` MODIFY `barcode` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `ingredients_barcode_key` ON `ingredients`(`barcode`);
