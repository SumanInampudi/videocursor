-- Add optional image URL for raw material / inventory item thumbnails
ALTER TABLE `inventory_items`
ADD COLUMN `imageUrl` TEXT NULL;

