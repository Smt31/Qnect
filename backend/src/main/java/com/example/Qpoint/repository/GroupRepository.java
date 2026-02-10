package com.example.Qpoint.repository;

import com.example.Qpoint.models.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    List<Group> findByCreatedByUserId(Long userId);
    
    // Optimized query with JOIN FETCH for createdBy (prevents N+1)
    @Query("SELECT g FROM Group g JOIN FETCH g.createdBy WHERE g.createdBy.userId = :userId")
    List<Group> findByCreatedByUserIdWithCreator(@Param("userId") Long userId);
    
    // Public groups discovery
    List<Group> findByIsPrivateFalseOrderByCreatedAtDesc();
    
    // Optimized public groups query with JOIN FETCH (prevents N+1)
    @Query("SELECT DISTINCT g FROM Group g LEFT JOIN FETCH g.createdBy WHERE g.isPrivate = false ORDER BY g.createdAt DESC")
    List<Group> findPublicGroupsWithCreator();
    
    List<Group> findByIsPrivateFalseAndNameContainingIgnoreCase(String query);
}
