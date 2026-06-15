-- Phase 5: Manager open discount and comp item promotions

ALTER TABLE `discounts`
  MODIFY `kind` ENUM(
    'CHECK_PERCENT',
    'CHECK_FIXED',
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'BOGO',
    'COMBO_PRICE',
    'TIERED_SPEND',
    'TIERED_QUANTITY',
    'MANAGER_OPEN',
    'COMP_ITEM'
  ) NOT NULL;

ALTER TABLE `order_applied_promotions`
  MODIFY `kind` ENUM(
    'CHECK_PERCENT',
    'CHECK_FIXED',
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'BOGO',
    'COMBO_PRICE',
    'TIERED_SPEND',
    'TIERED_QUANTITY',
    'MANAGER_OPEN',
    'COMP_ITEM'
  ) NOT NULL;

ALTER TABLE `order_applied_promotions`
  ADD COLUMN `appliedByUserId` VARCHAR(191) NULL;
