-- CreateTable expenses
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('RENT', 'SALARIES', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'EQUIPMENT', 'INSURANCE', 'MAINTENANCE', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 4) NOT NULL,
    `expenseDate` DATE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expenses_expenseDate_idx`(`expenseDate`),
    INDEX `expenses_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
