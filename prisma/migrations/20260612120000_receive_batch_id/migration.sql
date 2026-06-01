-- AlterTable
ALTER TABLE `inventory_purchases` ADD COLUMN `receiveBatchId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `inventory_purchases_receiveBatchId_idx` ON `inventory_purchases`(`receiveBatchId`);
