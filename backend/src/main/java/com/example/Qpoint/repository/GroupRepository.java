package com.example.Qpoint.repository;

import com.example.Qpoint.models.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    List<Group> findByCreatedByUserId(Long userId);
    
    // Future: findByNameContaining for search
}
