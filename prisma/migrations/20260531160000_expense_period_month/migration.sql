-- Accounting month for P&L (YYYY-MM), separate from optional payment date
ALTER TABLE `expenses` ADD COLUMN `periodMonth` VARCHAR(7) NULL;

UPDATE `expenses` SET `periodMonth` = DATE_FORMAT(`expenseDate`, '%Y-%m') WHERE `periodMonth` IS NULL;

ALTER TABLE `expenses` MODIFY `periodMonth` VARCHAR(7) NOT NULL;

CREATE INDEX `expenses_periodMonth_idx` ON `expenses`(`periodMonth`);

ALTER TABLE `expenses` MODIFY `expenseDate` DATE NULL;
