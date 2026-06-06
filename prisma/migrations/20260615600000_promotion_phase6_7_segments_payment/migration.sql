-- Phases 6–7: Customer segments, payment-method promos, customer DOB

ALTER TABLE `customers`
  ADD COLUMN `dateOfBirth` DATE NULL;

ALTER TABLE `discounts`
  MODIFY `application` ENUM('CODE', 'AUTO', 'MANAGER', 'PAYMENT_METHOD') NOT NULL DEFAULT 'CODE';

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
    'COMP_ITEM',
    'CUSTOMER_SEGMENT'
  ) NOT NULL;

ALTER TABLE `discounts`
  ADD COLUMN `paymentMethodsJson` JSON NOT NULL DEFAULT ('[]');

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
    'COMP_ITEM',
    'CUSTOMER_SEGMENT'
  ) NOT NULL;
