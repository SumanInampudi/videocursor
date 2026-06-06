-- Product inclusions (free sides with mains) + order line flag

CREATE TABLE `product_inclusions` (
    `id` VARCHAR(191) NOT NULL,
    `parentProductId` VARCHAR(191) NOT NULL,
    `includedProductId` VARCHAR(191) NOT NULL,
    `quantityPerParent` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `product_inclusions_parentProductId_includedProductId_key`(`parentProductId`, `includedProductId`),
    INDEX `product_inclusions_parentProductId_idx`(`parentProductId`),
    INDEX `product_inclusions_includedProductId_idx`(`includedProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `order_line_items` ADD COLUMN `isIncluded` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `product_inclusions` ADD CONSTRAINT `product_inclusions_parentProductId_fkey` FOREIGN KEY (`parentProductId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_inclusions` ADD CONSTRAINT `product_inclusions_includedProductId_fkey` FOREIGN KEY (`includedProductId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
