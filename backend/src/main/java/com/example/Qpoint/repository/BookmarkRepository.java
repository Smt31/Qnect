package com.example.Qpoint.repository;

import com.example.Qpoint.models.Bookmark;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Optional<Bookmark> findByUserAndPost(User user, Post post);
    Page<Bookmark> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    boolean existsByUserAndPost(User user, Post post);
    void deleteByPost(Post post);
    
    // Bulk fetch bookmarks for multiple posts (avoids N+1)
    List<Bookmark> findAllByUserAndPostIn(User user, List<Post> posts);
}
