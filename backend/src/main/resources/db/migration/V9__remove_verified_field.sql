-- Remove verified field from users table
-- This field was not being used meaningfully (all users were verified=true)

ALTER TABLE users DROP COLUMN verified;
