-- Remove answers table
-- News comments have been migrated to use the comments table
-- The answers table is empty (no data loss)

DROP TABLE IF EXISTS answers;
