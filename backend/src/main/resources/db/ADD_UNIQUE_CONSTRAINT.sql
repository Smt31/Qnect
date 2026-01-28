-- Add unique constraint to avoid duplicate deletion records
-- First, clean up any existing duplicates (keeping the earliest one)
DELETE FROM message_deletions a USING message_deletions b
WHERE a.id > b.id 
AND a.message_id = b.message_id 
AND a.user_id = b.user_id;

-- Now add the constraint
ALTER TABLE message_deletions
ADD CONSTRAINT uq_message_user UNIQUE (message_id, user_id);
