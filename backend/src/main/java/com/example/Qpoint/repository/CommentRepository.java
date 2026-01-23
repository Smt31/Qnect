package com.example.Qpoint.repository;

import com.example.Qpoint.models.Comment;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByPostAndParentIsNullOrderByCreatedAtDesc(Post post, Pageable pageable);
    Page<Comment> findByPostOrderByCreatedAtDesc(Post post, Pageable pageable);
    Page<Comment> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    void deleteByPost(Post post);
    
    // AI Comment methods
    Optional<Comment> findByPostAndIsAiGeneratedTrue(Post post);
    boolean existsByPostAndIsAiGeneratedTrue(Post post);
    
    // Optimized queries with JOIN FETCH to prevent N+1
    @Query("""
        SELECT DISTINCT c FROM Comment c 
        LEFT JOIN FETCH c.author 
        LEFT JOIN FETCH c.replies r 
        LEFT JOIN FETCH r.author 
        WHERE c.post.id = :postId AND c.parent IS NULL 
        ORDER BY c.createdAt DESC
        """)
    List<Comment> findTopLevelCommentsWithAuthors(@Param("postId") Long postId);
}
