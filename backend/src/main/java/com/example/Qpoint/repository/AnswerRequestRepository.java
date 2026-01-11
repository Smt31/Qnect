package com.example.Qpoint.repository;

import com.example.Qpoint.models.AnswerRequest;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerRequestRepository extends JpaRepository<AnswerRequest, Long> {
    List<AnswerRequest> findByQuestion(Post question);
    @org.springframework.data.jpa.repository.Query("SELECT ar FROM AnswerRequest ar JOIN FETCH ar.question JOIN FETCH ar.requestedBy WHERE ar.requestedTo = :user")
    List<AnswerRequest> findByRequestedTo(User user);
    List<AnswerRequest> findByRequestedBy(User user);
    
    // Check if a request already exists between these users for this question
    boolean existsByQuestionAndRequestedTo(Post question, User requestedTo);

    Optional<AnswerRequest> findByQuestionAndRequestedTo(Post question, User requestedTo);
    
    boolean existsByRequestedByAndRequestedTo(User requestedBy, User requestedTo);
    
    // Find all requests sent by a specific user for a specific question
    List<AnswerRequest> findByQuestionAndRequestedBy(Post question, User requestedBy);
}
