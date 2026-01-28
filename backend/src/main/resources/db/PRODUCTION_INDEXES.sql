-- ===================================================================
-- PRODUCTION-READY DATABASE INDEXES FOR QPOINT
-- Run this script manually in Neon SQL Editor
-- ===================================================================

-- ===================================================================
-- 1. POSTS TABLE - Core content queries
-- ===================================================================

-- Feed queries (most critical - used for every page load)
CREATE INDEX IF NOT EXISTS idx_posts_created_at 
ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_created 
ON posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_type_created 
ON posts(type, created_at DESC);

-- Hot/Trending feed (score calculation)
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score 
ON posts(((upvotes - downvotes) * 3 + comments_count * 2 + views_count) DESC, created_at DESC);

-- Unanswered questions
CREATE INDEX IF NOT EXISTS idx_posts_unanswered 
ON posts(answer_count, created_at DESC) 
WHERE answer_count = 0;

-- Search queries
CREATE INDEX IF NOT EXISTS idx_posts_title_search 
ON posts USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_posts_content_search 
ON posts USING gin(to_tsvector('english', content));


-- ===================================================================
-- 2. COMMENTS TABLE - Post detail page performance
-- ===================================================================

-- Load comments for a post
CREATE INDEX IF NOT EXISTS idx_comments_post_created 
ON comments(post_id, created_at DESC);

-- Top-level comments only
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created 
ON comments(post_id, parent_id, created_at DESC);

-- User's comment history
CREATE INDEX IF NOT EXISTS idx_comments_author_created 
ON comments(author_id, created_at DESC);


-- ===================================================================
-- 3. ANSWERS TABLE - Question pages
-- ===================================================================

-- Load answers for a question
CREATE INDEX IF NOT EXISTS idx_answers_post_created 
ON answers(post_id, created_at DESC);

-- User's answer history
CREATE INDEX IF NOT EXISTS idx_answers_author_created 
ON answers(author_id, created_at DESC);


-- ===================================================================
-- 4. VOTES TABLE - Engagement metrics
-- ===================================================================

-- Check user's vote on multiple entities
CREATE INDEX IF NOT EXISTS idx_votes_user_entity 
ON votes(user_id, entity_type, entity_id);

-- Count votes for an entity
CREATE INDEX IF NOT EXISTS idx_votes_entity_type 
ON votes(entity_type, entity_id, vote_type);


-- ===================================================================
-- 5. FOLLOWS TABLE - Social features
-- ===================================================================

-- Check if user follows another
CREATE INDEX IF NOT EXISTS idx_follows_follower_following 
ON follows(follower_id, following_id);

-- Get user's followers
CREATE INDEX IF NOT EXISTS idx_follows_following 
ON follows(following_id);

-- Get who user follows
CREATE INDEX IF NOT EXISTS idx_follows_follower 
ON follows(follower_id);


-- ===================================================================
-- 6. BOOKMARKS TABLE - User collections
-- ===================================================================

-- User's bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created 
ON bookmarks(user_id, created_at DESC);

-- Check if post is bookmarked
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_post 
ON bookmarks(user_id, post_id);


-- ===================================================================
-- 7. NOTIFICATIONS TABLE - Real-time updates
-- ===================================================================

-- User's notifications feed
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON notifications(recipient_id, created_at DESC);

-- Unread count
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
ON notifications(recipient_id, is_read) 
WHERE is_read = false;


-- ===================================================================
-- 8. CONVERSATIONS TABLE - Chat system
-- ===================================================================

-- Find conversation between 2 users
CREATE INDEX IF NOT EXISTS idx_conversations_users 
ON conversations(user1_id, user2_id);

-- User's conversation list
CREATE INDEX IF NOT EXISTS idx_conversations_user1_updated 
ON conversations(user1_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user2_updated 
ON conversations(user2_id, updated_at DESC);


-- ===================================================================
-- 9. MESSAGES TABLE - Chat messages
-- ===================================================================

-- Load messages for a conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at ASC);

-- Unread message count
CREATE INDEX IF NOT EXISTS idx_messages_conversation_receiver_unread 
ON messages(conversation_id, receiver_id, is_read) 
WHERE is_read = false;


-- ===================================================================
-- 10. MESSAGE_DELETIONS TABLE - Chat deletion (NEW)
-- ===================================================================

-- Check if message deleted for user
CREATE INDEX IF NOT EXISTS idx_md_message_user 
ON message_deletions(message_id, user_id);

-- Find globally deleted messages
CREATE INDEX IF NOT EXISTS idx_md_message_type 
ON message_deletions(message_id, deletion_type);

-- User's deletion history
CREATE INDEX IF NOT EXISTS idx_md_user 
ON message_deletions(user_id);


-- ===================================================================
-- 11. USERS TABLE - Authentication & search
-- ===================================================================

-- Username login
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- Email login
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- User search
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users USING gin(to_tsvector('english', username || ' ' || full_name));

-- Top users by reputation
CREATE INDEX IF NOT EXISTS idx_users_reputation 
ON users(reputation DESC);


-- ===================================================================
-- 12. POST_TAGS TABLE - Tag filtering
-- ===================================================================

-- Find posts by tag (many-to-many)
CREATE INDEX IF NOT EXISTS idx_post_tags_tag 
ON post_tags(tag);

CREATE INDEX IF NOT EXISTS idx_post_tags_post 
ON post_tags(post_id);


-- ===================================================================
-- 13. ANSWER_REQUESTS TABLE - Expert matching
-- ===================================================================

-- Requests sent by user
CREATE INDEX IF NOT EXISTS idx_answer_requests_by 
ON answer_requests(requested_by_id);

-- Requests to expert
CREATE INDEX IF NOT EXISTS idx_answer_requests_to 
ON answer_requests(requested_to_id);

-- Find existing request
CREATE INDEX IF NOT EXISTS idx_answer_requests_by_to 
ON answer_requests(requested_by_id, requested_to_id);


-- ===================================================================
-- VERIFICATION QUERY
-- Run this to see all created indexes
-- ===================================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
