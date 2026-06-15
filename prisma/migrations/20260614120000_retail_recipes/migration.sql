-- Retail / resale menu items (sell inventory directly, skip kitchen BOM)

ALTER TABLE `recipes`
  ADD COLUMN `recipeType` ENUM('PREPARED', 'RETAIL') NOT NULL DEFAULT 'PREPARED',
  ADD COLUMN `requiresKitchen` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `retailInventoryItemId` VARCHAR(191) NULL,
  ADD COLUMN `retailQuantityPerSale` DECIMAL(12, 4) NULL;

CREATE INDEX `recipes_businessId_recipeType_idx` ON `recipes`(`businessId`, `recipeType`);
CREATE INDEX `recipes_retailInventoryItemId_idx` ON `recipes`(`retailInventoryItemId`);

ALTER TABLE `recipes`
  ADD CONSTRAINT `recipes_retailInventoryItemId_fkey`
  FOREIGN KEY (`retailInventoryItemId`) REFERENCES `inventory_items`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
