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

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorInOrderByCreatedAtDesc(List<User> authors, Pageable pageable);
    
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    Page<Post> findAllOrderByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE :tag MEMBER OF p.tags ORDER BY p.createdAt DESC")
    Page<Post> findByTagOrderByCreatedAtDesc(@Param("tag") String tag, Pageable pageable);
    
    Page<Post> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    
    Page<Post> findByAuthorAndTypeOrderByCreatedAtDesc(User author, PostType type, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Post> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(@Param("query") String title, @Param("query") String content, Pageable pageable);
    
    @Query("SELECT p FROM Post p ORDER BY (p.viewsCount + p.likesCount * 2 + p.commentsCount) DESC, p.createdAt DESC")
    Page<Post> findTrendingPosts(Pageable pageable);

    // "For You" feed: rank by engagement + recency
    @Query("SELECT p FROM Post p ORDER BY ((p.upvotes - p.downvotes) * 3 + p.commentsCount * 2 + p.viewsCount) DESC, p.createdAt DESC")
    Page<Post> findForYouPosts(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.answerCount = 0 ORDER BY p.createdAt DESC")
    Page<Post> findUnansweredPosts(Pageable pageable);
}

