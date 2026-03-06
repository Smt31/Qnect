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

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE LOWER(t) = LOWER(:tag) ORDER BY p.createdAt DESC")
    Page<Post> findByTagIgnoreCaseOrderByCreatedAtDesc(@Param("tag") String tag, Pageable pageable);

    @Query(value = """
            SELECT p.* FROM posts p
            JOIN post_tags pt ON p.id = pt.post_id
            WHERE LOWER(pt.tag) = LOWER(:tag)
            ORDER BY (
                (p.upvotes * 1.0) +
                (p.comments_count * 2.0) +
                (p.views_count * 0.2) +
                CASE
                    WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 5
                    WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 3
                    WHEN p.created_at > NOW() - INTERVAL '72 hours' THEN 1
                    ELSE 0
                END
            ) DESC
            """,
            countQuery = "SELECT COUNT(*) FROM posts p JOIN post_tags pt ON p.id = pt.post_id WHERE LOWER(pt.tag) = LOWER(:tag)",
            nativeQuery = true)
    Page<Post> findByTagIgnoreCaseRanked(@Param("tag") String tag, Pageable pageable);
    
    Page<Post> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    
    Page<Post> findByAuthorAndTypeOrderByCreatedAtDesc(User author, PostType type, Pageable pageable);
    
    @Query("SELECT p FROM Post p JOIN p.topics t WHERE t.id = :topicId ORDER BY p.createdAt DESC")
    Page<Post> findByTopics_IdOrderByCreatedAtDesc(@Param("topicId") Long topicId, Pageable pageable);

    @Query(value = """
            SELECT p.* 
            FROM posts p 
            JOIN post_topics pt ON p.id = pt.post_id 
            WHERE pt.topic_id = :topicId 
            ORDER BY (
                (p.upvotes * 1.0) + 
                (p.comments_count * 2.0) + 
                (p.views_count * 0.2) + 
                CASE 
                    WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 5 
                    WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 3 
                    WHEN p.created_at > NOW() - INTERVAL '72 hours' THEN 1 
                    ELSE 0 
                END
            ) DESC
            """, 
            countQuery = "SELECT COUNT(*) FROM posts p JOIN post_topics pt ON p.id = pt.post_id WHERE pt.topic_id = :topicId",
            nativeQuery = true)
    Page<Post> findByTopicIdRanked(@Param("topicId") Long topicId, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Post> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(@Param("query") String title, @Param("query") String content, Pageable pageable);
    
    
    @Query("SELECT p FROM Post p JOIN FETCH p.author ORDER BY p.baseHotnessScore DESC, p.createdAt DESC")
    Page<Post> findTrendingPosts(Pageable pageable);

    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.commentsCount = 0 ORDER BY p.createdAt DESC")
    Page<Post> findUnansweredPosts(Pageable pageable);

    // ============================================================================
    // OPTIMIZED FEED QUERIES - Cursor-Based Pagination
    // ============================================================================

    // Recent posts (excludes own posts and NEWS_DISCUSSION) - Initial Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY p.createdAt DESC")
    List<Post> findRecentExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // Recent posts - Cursor Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION AND p.createdAt < :cursor ORDER BY p.createdAt DESC")
    List<Post> findRecentExcludingUserWithCursor(@Param("userId") Long userId, @Param("cursor") java.time.Instant cursor, Pageable pageable);

    // Unanswered questions - Initial Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.type = com.example.Qpoint.models.PostType.QUESTION AND p.author.userId <> :userId AND p.commentsCount = 0 ORDER BY p.createdAt DESC")
    List<Post> findUnansweredExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // Unanswered questions - Cursor Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.type = com.example.Qpoint.models.PostType.QUESTION AND p.author.userId <> :userId AND p.commentsCount = 0 AND p.createdAt < :cursor ORDER BY p.createdAt DESC")
    List<Post> findUnansweredExcludingUserWithCursor(@Param("userId") Long userId, @Param("cursor") java.time.Instant cursor, Pageable pageable);

    // For You Feed (Default fallback without personalization) - Initial Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY p.baseHotnessScore DESC, p.id DESC")
    List<Post> findForYouFallbackExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // For You Feed (Default fallback without personalization) - Cursor Load
    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION AND (p.baseHotnessScore < :cursorScore OR (p.baseHotnessScore = :cursorScore AND p.id < :cursorId)) ORDER BY p.baseHotnessScore DESC, p.id DESC")
    List<Post> findForYouFallbackExcludingUserWithCursor(@Param("userId") Long userId, @Param("cursorScore") Double cursorScore, @Param("cursorId") Long cursorId, Pageable pageable);


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
     * Cursor is based on the dynamically calculated score.
     */
    @Query(value = """
            SELECT p.id,
            (
                p.base_hotness_score
                * (CASE WHEN f.follower_id IS NOT NULL THEN 1.5 ELSE 1.0 END)
                * POWER(1.3, LEAST(COALESCE(tm.match_count, 0), 3))
                * (CASE WHEN pv.user_id IS NOT NULL THEN 0.5 ELSE 1.0 END)
            ) as final_score
            FROM posts p
            LEFT JOIN follows f ON p.author_id = f.following_id AND f.follower_id = :userId
            LEFT JOIN (
                SELECT pt.post_id, COUNT(ut.topic_id) as match_count
                FROM post_topics pt
                JOIN user_topics ut ON pt.topic_id = ut.topic_id AND ut.user_id = :userId
                GROUP BY pt.post_id
            ) tm ON p.id = tm.post_id
            LEFT JOIN post_views pv ON p.id = pv.post_id AND pv.user_id = :userId
            WHERE p.created_at > NOW() - INTERVAL '90 days'
              AND p.author_id <> :userId
              AND p.type <> 'NEWS_DISCUSSION'
            ORDER BY final_score DESC, p.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findPersonalizedFeedIdsInitial(@Param("userId") Long userId, @Param("limit") int limit);

    @Query(value = """
            SELECT sub.id, sub.final_score FROM (
                SELECT p.id,
                (
                    p.base_hotness_score
                    * (CASE WHEN f.follower_id IS NOT NULL THEN 1.5 ELSE 1.0 END)
                    * POWER(1.3, LEAST(COALESCE(tm.match_count, 0), 3))
                    * (CASE WHEN pv.user_id IS NOT NULL THEN 0.5 ELSE 1.0 END)
                ) as final_score
                FROM posts p
                LEFT JOIN follows f ON p.author_id = f.following_id AND f.follower_id = :userId
                LEFT JOIN (
                    SELECT pt.post_id, COUNT(ut.topic_id) as match_count
                    FROM post_topics pt
                    JOIN user_topics ut ON pt.topic_id = ut.topic_id AND ut.user_id = :userId
                    GROUP BY pt.post_id
                ) tm ON p.id = tm.post_id
                LEFT JOIN post_views pv ON p.id = pv.post_id AND pv.user_id = :userId
                WHERE p.created_at > NOW() - INTERVAL '90 days'
                  AND p.author_id <> :userId
                  AND p.type <> 'NEWS_DISCUSSION'
            ) sub
            WHERE sub.final_score < :cursorScore
               OR (sub.final_score = :cursorScore AND sub.id < :cursorId)
            ORDER BY sub.final_score DESC, sub.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findPersonalizedFeedIdsWithCursor(@Param("userId") Long userId, @Param("cursorScore") Double cursorScore, @Param("cursorId") Long cursorId, @Param("limit") int limit);

    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.id IN :ids")
    List<Post> findByIdsWithAuthor(@Param("ids") List<Long> ids);
}



