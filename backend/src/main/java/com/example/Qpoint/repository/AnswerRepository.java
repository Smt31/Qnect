package com.example.Qpoint.repository;

import com.example.Qpoint.models.Answer;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    Page<Answer> findByPostOrderByCreatedAtDesc(Post post, Pageable pageable);
    List<Answer> findByPostOrderByCreatedAtDesc(Post post);
    Page<Answer> findByAuthorOrderByCreatedAtDesc(User author, Pageable pageable);
    void deleteByPost(Post post);
    
    // Count answers for a post (accurate count from database)
    long countByPost(Post post);
    
    // Check if author has answered a question by a specific user (post author)
    boolean existsByAuthorAndPost_Author(User author, User postAuthor);
}
