-- Remove unused likes and comment_likes tables
-- These tables were part of unimplemented features
-- The application uses the voting system (upvotes/downvotes) instead

DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comment_likes;
