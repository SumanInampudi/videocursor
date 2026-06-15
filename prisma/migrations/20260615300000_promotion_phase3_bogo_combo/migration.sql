-- Phase 3: BOGO and combo bundle promotions

ALTER TABLE `discounts`
  MODIFY `kind` ENUM(
    'CHECK_PERCENT',
    'CHECK_FIXED',
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'BOGO',
    'COMBO_PRICE'
  ) NOT NULL;

ALTER TABLE `order_applied_promotions`
  MODIFY `kind` ENUM(
    'CHECK_PERCENT',
    'CHECK_FIXED',
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'BOGO',
    'COMBO_PRICE'
  ) NOT NULL;

ALTER TABLE `promotion_targets`
  ADD COLUMN `role` ENUM('APPLY_TO', 'BUY', 'GET', 'BUNDLE_MEMBER') NOT NULL DEFAULT 'APPLY_TO';
