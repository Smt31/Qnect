package com.example.Qpoint.repository;

import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.PostType;
import com.example.Qpoint.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorInOrderByCreatedAtDesc(List<User> authors, Pageable pageable);
    
    // Count posts by author for dynamic stats
    long countByAuthor(User author);
    
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    Page<Post> findAllOrderByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE :tag MEMBER OF p.tags ORDER BY p.createdAt DESC")
    Page<Post> findByTagOrderByCreatedAtDesc(@Param("tag") String tag, Pageable pageable);
    
    Page<Post> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    
    Page<Post> findByAuthorAndTypeOrderByCreatedAtDesc(User author, PostType type, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Post> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(@Param("query") String title, @Param("query") String content, Pageable pageable);
    
    
    @Query("SELECT p FROM Post p JOIN FETCH p.author ORDER BY ((p.upvotes - p.downvotes) * 2 + p.viewsCount + p.commentsCount) DESC, p.createdAt DESC")
    Page<Post> findTrendingPosts(Pageable pageable);

    // "For You" feed: rank by engagement + recency
    @Query("SELECT p FROM Post p JOIN FETCH p.author ORDER BY ((p.upvotes - p.downvotes) * 3 + p.commentsCount * 2 + p.viewsCount) DESC, p.createdAt DESC")
    Page<Post> findForYouPosts(Pageable pageable);

    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.commentsCount = 0 ORDER BY p.createdAt DESC")
    Page<Post> findUnansweredPosts(Pageable pageable);

    // ============================================================================
    // OPTIMIZED FEED QUERIES - Author is eagerly fetched via Post entity
    // ============================================================================

    // Recent posts (excludes own posts and NEWS_DISCUSSION)
    // Recent posts (excludes own posts and NEWS_DISCUSSION)
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY p.createdAt DESC")
    Page<Post> findAllExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // For You feed (engagement-ranked, excludes own posts)
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY ((p.upvotes - p.downvotes) * 3 + p.commentsCount * 2 + p.viewsCount) DESC, p.createdAt DESC")
    Page<Post> findForYouPostsExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // Unanswered questions (only QUESTION type, excludes own questions and questions with ANY comments)
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.type = com.example.Qpoint.models.PostType.QUESTION AND p.author.userId <> :userId AND p.commentsCount = 0 ORDER BY p.createdAt DESC")
    Page<Post> findUnansweredPostsExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // Find news discussion post by external article URL
    Optional<Post> findByExternalUrl(String externalUrl);

    // Bulk fetch news discussion posts by external URLs (avoids N+1)
    List<Post> findAllByExternalUrlIn(List<String> externalUrls);

    // ============================================================================
    // BULK TAG FETCHING - Native query to avoid N+1 on ElementCollection
    // ============================================================================
    
    @Query(value = "SELECT post_id, tag FROM post_tags WHERE post_id IN :postIds", nativeQuery = true)
    List<Object[]> findTagsByPostIds(@Param("postIds") List<Long> postIds);

    /**
     * PERSONALIZED FEED ALGORITHM (Native SQL)
     * Returns IDs of posts, ranked by parameters.
     * Service layer will fetch full entities to ensure eager loading of Authors.
     */
    @Query(value = """
            SELECT p.id 
            FROM posts p
            LEFT JOIN follows f ON p.author_id = f.following_id AND f.follower_id = :userId
            LEFT JOIN (
                SELECT pt.post_id, COUNT(ut.topic_id) as match_count
                FROM post_topics pt
                JOIN user_topics ut ON pt.topic_id = ut.topic_id AND ut.user_id = :userId
                GROUP BY pt.post_id
            ) tm ON p.id = tm.post_id
            LEFT JOIN post_views pv ON p.id = pv.post_id AND pv.user_id = :userId
            WHERE p.created_at > NOW() - INTERVAL '7 days'
              AND p.author_id <> :userId
              AND p.type <> 'NEWS_DISCUSSION'
            ORDER BY (
                LN(10 + (p.upvotes * 1) + (p.comments_count * 5) + (p.views_count * 0.1))
                * POWER(1 + EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 / 12, -1.5)
                * (CASE WHEN f.follower_id IS NOT NULL THEN 1.5 ELSE 1.0 END)
                * POWER(1.3, LEAST(COALESCE(tm.match_count, 0), 3))
                * (CASE WHEN pv.user_id IS NOT NULL THEN 0.5 ELSE 1.0 END)
            ) DESC
            """, 
            countQuery = """
            SELECT COUNT(*) 
            FROM posts p
            WHERE p.created_at > NOW() - INTERVAL '7 days'
              AND p.author_id <> :userId
              AND p.type <> 'NEWS_DISCUSSION'
            """,
            nativeQuery = true)
    Page<Long> findPersonalizedFeedIds(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.id IN :ids")
    List<Post> findByIdsWithAuthor(@Param("ids") List<Long> ids);
}



