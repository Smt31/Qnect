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
    
    
    @Query("SELECT p FROM Post p ORDER BY ((p.upvotes - p.downvotes) * 2 + p.viewsCount + p.commentsCount) DESC, p.createdAt DESC")
    Page<Post> findTrendingPosts(Pageable pageable);

    // "For You" feed: rank by engagement + recency
    @Query("SELECT p FROM Post p ORDER BY ((p.upvotes - p.downvotes) * 3 + p.commentsCount * 2 + p.viewsCount) DESC, p.createdAt DESC")
    Page<Post> findForYouPosts(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.answerCount = 0 ORDER BY p.createdAt DESC")
    Page<Post> findUnansweredPosts(Pageable pageable);

    // ============================================================================
    // OPTIMIZED FEED QUERIES - Author is eagerly fetched via Post entity
    // ============================================================================

    // Recent posts (excludes own posts and NEWS_DISCUSSION)
    @Query("SELECT p FROM Post p WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY p.createdAt DESC")
    Page<Post> findAllExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // For You feed (engagement-ranked, excludes own posts)
    @Query("SELECT p FROM Post p WHERE p.author.userId <> :userId AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY ((p.upvotes - p.downvotes) * 3 + p.commentsCount * 2 + p.viewsCount) DESC, p.createdAt DESC")
    Page<Post> findForYouPostsExcludingUser(@Param("userId") Long userId, Pageable pageable);

    // Unanswered posts (excludes own posts)
    @Query("SELECT p FROM Post p WHERE p.author.userId <> :userId AND p.answerCount = 0 AND p.type <> com.example.Qpoint.models.PostType.NEWS_DISCUSSION ORDER BY p.createdAt DESC")
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
}



