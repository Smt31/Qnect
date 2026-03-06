-- Add base_hotness_score to posts if it doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS base_hotness_score DOUBLE PRECISION DEFAULT 0.0;

-- Initialize the score for existing posts to prevent NULLs
UPDATE posts 
SET base_hotness_score = 
    LN(10 + (upvotes * 1) + (comments_count * 5) + (views_count * 0.1)) 
    * POWER(1 + EXTRACT(EPOCH FROM (NOW() - created_at))/3600 / 12, -1.5)
WHERE base_hotness_score = 0.0 OR base_hotness_score IS NULL;

-- Create an index for faster sorting on the score
CREATE INDEX IF NOT EXISTS idx_posts_hotness ON posts(base_hotness_score DESC);
