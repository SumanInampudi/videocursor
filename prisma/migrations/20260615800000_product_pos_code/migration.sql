-- Short POS quick codes (1, 2, 3…) for register voice / keypad entry

ALTER TABLE `products` ADD COLUMN `posCode` INTEGER NULL;

CREATE UNIQUE INDEX `products_businessId_posCode_key` ON `products`(`businessId`, `posCode`);

CREATE INDEX `products_businessId_posCode_idx` ON `products`(`businessId`, `posCode`);
