-- GST / tip snapshot on orders (rates frozen at payment time)
ALTER TABLE `orders`
  ADD COLUMN `pricesIncludeTax` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `gstRatePercent` DECIMAL(5, 2) NULL,
  ADD COLUMN `taxSupplyType` VARCHAR(32) NULL,
  ADD COLUMN `taxableAmount` DECIMAL(12, 4) NULL,
  ADD COLUMN `cgstPercent` DECIMAL(5, 2) NULL,
  ADD COLUMN `sgstPercent` DECIMAL(5, 2) NULL,
  ADD COLUMN `igstPercent` DECIMAL(5, 2) NULL,
  ADD COLUMN `cgstAmount` DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN `sgstAmount` DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN `igstAmount` DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN `taxTotal` DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN `tipAmount` DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN `grandTotal` DECIMAL(12, 4) NULL,
  ADD COLUMN `taxGstin` VARCHAR(20) NULL,
  ADD COLUMN `taxLegalName` VARCHAR(255) NULL;
