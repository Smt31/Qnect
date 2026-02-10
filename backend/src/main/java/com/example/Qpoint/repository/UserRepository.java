package com.example.Qpoint.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.example.Qpoint.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    
    @Query("SELECT u FROM User u ORDER BY u.reputation DESC")
    List<User> findTop10ByOrderByReputationDesc();

    // Optimized with LEFT JOIN instead of NOT IN subquery for better performance
    @Query("SELECT u FROM User u LEFT JOIN Follow f ON f.following.userId = u.userId AND f.follower.userId = :currentUserId WHERE u.userId <> :currentUserId AND f.id IS NULL ORDER BY u.reputation DESC")
    List<User> findTopUsersNotFollowedBy(Long currentUserId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT DISTINCT u FROM User u JOIN u.topics t WHERE t IN :topics AND u.userId <> :excludeUserId")
    List<User> findDistinctByTopicsInAndUserIdNot(java.util.Collection<com.example.Qpoint.models.Topic> topics, Long excludeUserId);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<User> searchUsers(String query, Pageable pageable);
    
    List<User> findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(String username, String fullName);
    
    @Query("SELECT DISTINCT u FROM User u JOIN u.topics t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :topic, '%'))")
    List<User> findByTopicsNameContainingIgnoreCase(String topic);
    
    List<User> findByAllowPublicMessagesTrue();
}
