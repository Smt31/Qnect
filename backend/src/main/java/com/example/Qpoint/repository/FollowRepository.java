package com.example.Qpoint.repository;

import com.example.Qpoint.models.Follow;
import com.example.Qpoint.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    Optional<Follow> findByFollowerAndFollowing(User follower, User following);
    List<Follow> findByFollower(User follower);
    List<Follow> findByFollowing(User following);
    boolean existsByFollowerAndFollowing(User follower, User following);
    
    // Count methods for dynamic stats
    long countByFollower(User follower);  // How many users this person follows
    long countByFollowing(User following); // How many followers this person has
}