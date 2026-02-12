package com.example.Qpoint.repository;

import com.example.Qpoint.models.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    Optional<Topic> findByName(String name);
    List<Topic> findByNameIn(List<String> names);
    org.springframework.data.domain.Page<Topic> findByNameContainingIgnoreCase(String name, org.springframework.data.domain.Pageable pageable);
}
