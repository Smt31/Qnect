-- Remove unused likes_count column from posts table
-- This field was never implemented (no service, no frontend UI)
-- The application uses upvotes/downvotes from the voting system instead

ALTER TABLE posts DROP COLUMN IF EXISTS likes_count;
