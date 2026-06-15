-- Servora — wipe catalog, inventory, and orders; KEEP businesses, users, tables, settings
--
-- Usage:
--   mysql -u root -p servora_inventory < scripts/cleanup-catalog-only.sql
--
-- Keeps: businesses, users, user_businesses, dining_tables, app_settings
-- Removes: raw materials, stock, products, orders, customers, suppliers, discounts, expenses, audit

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `order_line_consumptions`;
TRUNCATE TABLE `order_line_items`;
TRUNCATE TABLE `table_reservations`;
TRUNCATE TABLE `orders`;
TRUNCATE TABLE `inventory_purchases`;
TRUNCATE TABLE `expenses`;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `inventory_cost_history`;
TRUNCATE TABLE `inventory_cost_layers`;
TRUNCATE TABLE `product_ingredients`;
TRUNCATE TABLE `products`;
TRUNCATE TABLE `inventory_items`;
TRUNCATE TABLE `discounts`;
TRUNCATE TABLE `customers`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `ingredients`;

SET FOREIGN_KEY_CHECKS = 1;
