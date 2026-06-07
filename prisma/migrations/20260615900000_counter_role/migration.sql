-- Counter / retail pickup display role

ALTER TABLE `users` MODIFY `role` ENUM('OWNER', 'MANAGER', 'POS', 'KITCHEN', 'COUNTER', 'VIEWER') NOT NULL DEFAULT 'POS';

ALTER TABLE `user_businesses` MODIFY `role` ENUM('OWNER', 'MANAGER', 'POS', 'KITCHEN', 'COUNTER', 'VIEWER') NOT NULL;
