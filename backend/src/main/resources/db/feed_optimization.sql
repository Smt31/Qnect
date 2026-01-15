-- =============================================================================
-- OPTIMAL FEED LOADING STRATEGY FOR QPOINT
-- PostgreSQL + Spring JPA
-- =============================================================================

-- GOAL: Load feed page (10 posts) with MAXIMUM 3 queries total:
-- 1. Posts + Authors (JOIN FETCH)
-- 2. Votes for current user (bulk)  
-- 3. Bookmarks for current user (bulk)

-- =============================================================================
-- REQUIRED INDEXES
-- =============================================================================

-- Primary feed sorting index (covers FOR_YOU algorithm)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_feed_ranking 
ON posts (
    ((upvotes - downvotes) * 3 + comments_count * 2 + views_count) DESC,
    created_at DESC
) WHERE type <> 'NEWS_DISCUSSION';

-- Recent posts index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_recent
ON posts (created_at DESC)
WHERE type <> 'NEWS_DISCUSSION';

-- Self-exclusion filter (author + type)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_type
ON posts (author_id, type);

-- Votes lookup (critical for bulk vote fetch)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_entity
ON votes (user_id, entity_type, entity_id);

-- Bookmarks lookup (bulk bookmark fetch)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user_post
ON bookmarks (user_id, post_id);

-- Tags collection (avoid N+1 on tags)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_tags_post
ON post_tags (post_id);

-- =============================================================================
-- OPTIMAL QUERIES
-- =============================================================================

-- QUERY 1: Feed posts with author (JOIN FETCH prevents N+1 on author)
-- This query handles: posts, authors, and denormalized counts
SELECT p.*, u.* 
FROM posts p
JOIN users u ON p.author_id = u.user_id
WHERE p.author_id <> :currentUserId
  AND p.type <> 'NEWS_DISCUSSION'
ORDER BY ((p.upvotes - p.downvotes) * 3 + p.comments_count * 2 + p.views_count) DESC,
         p.created_at DESC
LIMIT :pageSize OFFSET :offset;

-- QUERY 2: Bulk fetch votes for all feed posts
SELECT v.entity_id, v.vote_type
FROM votes v
WHERE v.user_id = :currentUserId
  AND v.entity_type = 'QUESTION'
  AND v.entity_id IN (:postIds);

-- QUERY 3: Bulk fetch bookmarks for all feed posts
SELECT b.post_id
FROM bookmarks b
WHERE b.user_id = :currentUserId
  AND b.post_id IN (:postIds);

-- QUERY 4 (if tags needed separately): Bulk fetch tags
SELECT pt.post_id, pt.tag
FROM post_tags pt
WHERE pt.post_id IN (:postIds);

-- =============================================================================
-- TOTAL: 3-4 queries regardless of page size (vs 2N+1 before)
-- =============================================================================
