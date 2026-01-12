package com.example.Qpoint.repository;

import com.example.Qpoint.models.Comment;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByPostAndParentIsNullOrderByCreatedAtDesc(Post post, Pageable pageable);
    Page<Comment> findByPostOrderByCreatedAtDesc(Post post, Pageable pageable);
    Page<Comment> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    void deleteByPost(Post post);
    
    // AI Comment methods
    Optional<Comment> findByPostAndIsAiGeneratedTrue(Post post);
    boolean existsByPostAndIsAiGeneratedTrue(Post post);
}
