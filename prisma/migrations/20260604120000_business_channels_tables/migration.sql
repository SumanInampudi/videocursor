-- Business & multi-tenant + order channels + dining tables

CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `businesses_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `businesses` (`id`, `name`, `slug`, `timezone`, `currency`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('default-business', 'Default Restaurant', 'default', 'Asia/Kolkata', 'INR', true, NOW(3), NOW(3));

CREATE TABLE `user_businesses` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MANAGER', 'POS', 'KITCHEN', 'VIEWER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `user_businesses_userId_businessId_key`(`userId`, `businessId`),
    INDEX `user_businesses_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_businesses` ADD CONSTRAINT `user_businesses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_businesses` ADD CONSTRAINT `user_businesses_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `user_businesses` (`id`, `userId`, `businessId`, `role`, `createdAt`)
SELECT CONCAT('ub-', `id`), `id`, 'default-business', `role`, NOW(3) FROM `users`;

CREATE TABLE `dining_tables` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NULL,
    `capacity` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `dining_tables_businessId_code_key`(`businessId`, `code`),
    INDEX `dining_tables_businessId_isActive_idx`(`businessId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dining_tables` ADD CONSTRAINT `dining_tables_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Default tables T1-T12
INSERT INTO `dining_tables` (`id`, `businessId`, `code`, `label`, `section`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
('dt-1', 'default-business', '1', 'Table 1', 'Main', 1, true, NOW(3), NOW(3)),
('dt-2', 'default-business', '2', 'Table 2', 'Main', 2, true, NOW(3), NOW(3)),
('dt-3', 'default-business', '3', 'Table 3', 'Main', 3, true, NOW(3), NOW(3)),
('dt-4', 'default-business', '4', 'Table 4', 'Main', 4, true, NOW(3), NOW(3)),
('dt-5', 'default-business', '5', 'Table 5', 'Main', 5, true, NOW(3), NOW(3)),
('dt-6', 'default-business', '6', 'Table 6', 'Main', 6, true, NOW(3), NOW(3)),
('dt-7', 'default-business', '7', 'Table 7', 'Main', 7, true, NOW(3), NOW(3)),
('dt-8', 'default-business', '8', 'Table 8', 'Main', 8, true, NOW(3), NOW(3)),
('dt-9', 'default-business', '9', 'Table 9', 'Patio', 9, true, NOW(3), NOW(3)),
('dt-10', 'default-business', '10', 'Table 10', 'Patio', 10, true, NOW(3), NOW(3)),
('dt-11', 'default-business', '11', 'Table 11', 'Patio', 11, true, NOW(3), NOW(3)),
('dt-12', 'default-business', '12', 'Table 12', 'Patio', 12, true, NOW(3), NOW(3));

-- Orders: channel + table fields
ALTER TABLE `orders` ADD COLUMN `businessId` VARCHAR(191) NULL,
    ADD COLUMN `channel` ENUM('DINE_IN', 'ONLINE') NOT NULL DEFAULT 'DINE_IN',
    ADD COLUMN `diningTableId` VARCHAR(191) NULL,
    ADD COLUMN `tableLabel` VARCHAR(191) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL;

UPDATE `orders` SET `businessId` = 'default-business';

ALTER TABLE `orders` MODIFY `businessId` VARCHAR(191) NOT NULL;

ALTER TABLE `orders` DROP INDEX `orders_orderNumber_key`;
CREATE UNIQUE INDEX `orders_businessId_orderNumber_key` ON `orders`(`businessId`, `orderNumber`);
CREATE INDEX `orders_businessId_status_idx` ON `orders`(`businessId`, `status`);
CREATE INDEX `orders_businessId_createdAt_idx` ON `orders`(`businessId`, `createdAt`);
CREATE INDEX `orders_businessId_channel_idx` ON `orders`(`businessId`, `channel`);

ALTER TABLE `orders` ADD CONSTRAINT `orders_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `orders_diningTableId_fkey` FOREIGN KEY (`diningTableId`) REFERENCES `dining_tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Ingredients
ALTER TABLE `ingredients` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `ingredients` SET `businessId` = 'default-business';
ALTER TABLE `ingredients` MODIFY `businessId` VARCHAR(191) NOT NULL;
ALTER TABLE `ingredients` DROP INDEX `ingredients_normalizedName_key`;
ALTER TABLE `ingredients` DROP INDEX `ingredients_sku_key`;
ALTER TABLE `ingredients` DROP INDEX `ingredients_barcode_key`;
CREATE UNIQUE INDEX `ingredients_businessId_normalizedName_key` ON `ingredients`(`businessId`, `normalizedName`);
CREATE UNIQUE INDEX `ingredients_businessId_sku_key` ON `ingredients`(`businessId`, `sku`);
CREATE UNIQUE INDEX `ingredients_businessId_barcode_key` ON `ingredients`(`businessId`, `barcode`);
CREATE INDEX `ingredients_businessId_category_idx` ON `ingredients`(`businessId`, `category`);
CREATE INDEX `ingredients_businessId_isActive_idx` ON `ingredients`(`businessId`, `isActive`);
ALTER TABLE `ingredients` ADD CONSTRAINT `ingredients_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Suppliers
ALTER TABLE `suppliers` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `suppliers` SET `businessId` = 'default-business';
ALTER TABLE `suppliers` MODIFY `businessId` VARCHAR(191) NOT NULL;
CREATE INDEX `suppliers_businessId_isActive_idx` ON `suppliers`(`businessId`, `isActive`);
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Customers
ALTER TABLE `customers` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `customers` SET `businessId` = 'default-business';
ALTER TABLE `customers` MODIFY `businessId` VARCHAR(191) NOT NULL;
CREATE INDEX `customers_businessId_name_idx` ON `customers`(`businessId`, `name`);
ALTER TABLE `customers` ADD CONSTRAINT `customers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Discounts
ALTER TABLE `discounts` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `discounts` SET `businessId` = 'default-business';
ALTER TABLE `discounts` MODIFY `businessId` VARCHAR(191) NOT NULL;
ALTER TABLE `discounts` DROP INDEX `discounts_code_key`;
CREATE UNIQUE INDEX `discounts_businessId_code_key` ON `discounts`(`businessId`, `code`);
CREATE INDEX `discounts_businessId_isActive_idx` ON `discounts`(`businessId`, `isActive`);
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Inventory items
ALTER TABLE `inventory_items` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `inventory_items` SET `businessId` = 'default-business';
ALTER TABLE `inventory_items` MODIFY `businessId` VARCHAR(191) NOT NULL;
ALTER TABLE `inventory_items` DROP INDEX `inventory_items_sku_key`;
CREATE UNIQUE INDEX `inventory_items_businessId_sku_key` ON `inventory_items`(`businessId`, `sku`);
CREATE INDEX `inventory_items_businessId_ingredientId_idx` ON `inventory_items`(`businessId`, `ingredientId`);
CREATE INDEX `inventory_items_businessId_supplierId_idx` ON `inventory_items`(`businessId`, `supplierId`);
CREATE INDEX `inventory_items_businessId_category_idx` ON `inventory_items`(`businessId`, `category`);
CREATE INDEX `inventory_items_businessId_isActive_idx` ON `inventory_items`(`businessId`, `isActive`);
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Recipes
ALTER TABLE `recipes` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `recipes` SET `businessId` = 'default-business';
ALTER TABLE `recipes` MODIFY `businessId` VARCHAR(191) NOT NULL;
ALTER TABLE `recipes` DROP INDEX `recipes_barcode_key`;
CREATE UNIQUE INDEX `recipes_businessId_barcode_key` ON `recipes`(`businessId`, `barcode`);
CREATE INDEX `recipes_businessId_category_idx` ON `recipes`(`businessId`, `category`);
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Expenses
ALTER TABLE `expenses` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `expenses` SET `businessId` = 'default-business';
ALTER TABLE `expenses` MODIFY `businessId` VARCHAR(191) NOT NULL;
CREATE INDEX `expenses_businessId_periodMonth_idx` ON `expenses`(`businessId`, `periodMonth`);
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- App settings
ALTER TABLE `app_settings` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `app_settings` SET `businessId` = 'default-business';
ALTER TABLE `app_settings` MODIFY `businessId` VARCHAR(191) NOT NULL;
ALTER TABLE `app_settings` DROP INDEX `app_settings_key_key`;
CREATE UNIQUE INDEX `app_settings_businessId_key_key` ON `app_settings`(`businessId`, `key`);
ALTER TABLE `app_settings` ADD CONSTRAINT `app_settings_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit log (optional business)
ALTER TABLE `audit_logs` ADD COLUMN `businessId` VARCHAR(191) NULL;
UPDATE `audit_logs` SET `businessId` = 'default-business';
CREATE INDEX `audit_logs_businessId_idx` ON `audit_logs`(`businessId`);

-- Venue defaults
INSERT INTO `app_settings` (`id`, `businessId`, `key`, `value`, `updatedAt`) VALUES
('vs-dine-in', 'default-business', 'pos_enable_dine_in', 'true', NOW(3)),
('vs-online', 'default-business', 'pos_enable_online', 'true', NOW(3)),
('vs-req-table', 'default-business', 'pos_require_table_dine_in', 'true', NOW(3)),
('vs-default-ch', 'default-business', 'pos_default_channel', 'DINE_IN', NOW(3))
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
