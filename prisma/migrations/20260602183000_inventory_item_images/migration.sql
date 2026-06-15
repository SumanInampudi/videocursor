-- Add optional image URL for inventory item thumbnails (idempotent)

SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'inventory_items' AND column_name = 'imageUrl'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `inventory_items` ADD COLUMN `imageUrl` TEXT NULL',
  'SELECT 1'
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;
