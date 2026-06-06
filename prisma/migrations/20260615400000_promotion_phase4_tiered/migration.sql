-- Phase 4: Tiered spend and quantity promotions

ALTER TABLE `discounts`
  MODIFY `kind` ENUM(
    'CHECK_PERCENT',
    'CHECK_FIXED',
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'BOGO',
    'COMBO_PRICE',
    'TIERED_SPEND',
    'TIERED_QUANTITY'
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
    'TIERED_QUANTITY'
  ) NOT NULL;
