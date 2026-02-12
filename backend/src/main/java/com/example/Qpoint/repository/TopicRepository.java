package com.example.Qpoint.repository;

import com.example.Qpoint.models.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    Optional<Topic> findByName(String name);
    List<Topic> findByNameIn(List<String> names);
    org.springframework.data.domain.Page<Topic> findByNameContainingIgnoreCase(String name, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Topic t WHERE LOWER(t.name) IN :names")
    List<Topic> findByNameInIgnoreCase(@org.springframework.data.repository.query.Param("names") List<String> names);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = 
        "UPDATE topics t SET post_count = (SELECT COUNT(*) FROM post_topics pt WHERE pt.topic_id = t.id)", 
        nativeQuery = true)
    void updatePostCounts();
}
