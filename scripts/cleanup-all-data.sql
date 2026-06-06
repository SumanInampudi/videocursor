-- Servora / videocursor — wipe ALL application data (MySQL)
--
-- Usage (replace connection details):
--   mysql -u root -p servora_inventory < scripts/cleanup-all-data.sql
--
-- Or from project root with DATABASE_URL host/db:
--   mysql -h 127.0.0.1 -u USER -p DATABASE_NAME < scripts/cleanup-all-data.sql
--
-- After this, run `npm run db:seed` to recreate empty venue + default logins.
--
-- WARNING: This deletes EVERYTHING including users, businesses, and settings.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `order_line_consumptions`;
TRUNCATE TABLE `order_line_items`;
TRUNCATE TABLE `table_reservations`;
TRUNCATE TABLE `orders`;
TRUNCATE TABLE `inventory_purchases`;
TRUNCATE TABLE `expenses`;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `app_settings`;
TRUNCATE TABLE `inventory_cost_history`;
TRUNCATE TABLE `inventory_cost_layers`;
TRUNCATE TABLE `product_ingredients`;
TRUNCATE TABLE `products`;
TRUNCATE TABLE `inventory_items`;
TRUNCATE TABLE `discounts`;
TRUNCATE TABLE `customers`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `ingredients`;
TRUNCATE TABLE `user_businesses`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `dining_tables`;
TRUNCATE TABLE `businesses`;

SET FOREIGN_KEY_CHECKS = 1;

-- Verify (optional — should return 0 for each)
-- SELECT 'businesses' AS t, COUNT(*) AS n FROM businesses
-- UNION ALL SELECT 'users', COUNT(*) FROM users
-- UNION ALL SELECT 'ingredients', COUNT(*) FROM ingredients
-- UNION ALL SELECT 'products', COUNT(*) FROM products
-- UNION ALL SELECT 'orders', COUNT(*) FROM orders;
