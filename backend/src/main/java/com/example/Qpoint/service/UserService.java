package com.example.Qpoint.service;

import com.example.Qpoint.controller.UserController.UpdateProfileRequest;
import com.example.Qpoint.dto.UserProfileDto;
import com.example.Qpoint.dto.UserStatsDto;
import com.example.Qpoint.dto.SuggestionsDto;
import com.example.Qpoint.models.User;
import com.example.Qpoint.models.Follow;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.repository.FollowRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.stream.Collectors;

import com.example.Qpoint.models.Notification;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final com.example.Qpoint.repository.TopicRepository topicRepository;

    public UserService(UserRepository userRepository, FollowRepository followRepository, PasswordEncoder passwordEncoder, NotificationService notificationService, com.example.Qpoint.repository.TopicRepository topicRepository) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.topicRepository = topicRepository;
    }

    @Cacheable(value = "users", key = "#userId")
    public UserProfileDto getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToUserProfileDto(user);
    }

    public UserProfileDto getUserProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToUserProfileDto(user);
    }

    public boolean isUsernameTaken(String username) {
        return userRepository.existsByUsername(username);
    }

    @Transactional
    public User registerUser(String username, String email, String password, String fullName) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already taken");
        }
        User user = User.builder()
                .email(email)
                .username(username)
                .fullName(fullName == null || fullName.isBlank() ? username : fullName)
                .passwordHash(passwordEncoder.encode(password))
                .verified(true)
                .build();
        return userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }
        return user;
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#userId"),
        @CacheEvict(value = "userStats", key = "#userId")
    })
    public UserProfileDto updateUserProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update fields if provided
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getLocation() != null) {
            user.setLocation(request.getLocation());
        }

        // Handle username update with validation
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            // Check if username is already taken
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new RuntimeException("Username is already taken");
            }
            user.setUsername(request.getUsername());
        }
        if (request.getAllowPublicMessages() != null) {
            user.setAllowPublicMessages(request.getAllowPublicMessages());
        }

        User updatedUser = userRepository.save(user);

        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(updatedUser.getUserId());
        dto.setEmail(updatedUser.getEmail());
        dto.setUsername(updatedUser.getUsername());
        dto.setFullName(updatedUser.getFullName());
        dto.setAvatarUrl(updatedUser.getAvatarUrl());
        dto.setBio(updatedUser.getBio());
        dto.setLocation(updatedUser.getLocation());
        dto.setJoinedAt(updatedUser.getCreatedAt());
        dto.setReputation(updatedUser.getReputation());
        dto.setFollowersCount(updatedUser.getFollowersCount());
        dto.setFollowingCount(updatedUser.getFollowingCount());
        dto.setQuestionsCount(updatedUser.getQuestionsCount());
        dto.setAnswersCount(updatedUser.getAnswersCount());
        dto.setSkills(updatedUser.getSkills());
        dto.setVerified(updatedUser.getVerified());
        dto.setAllowPublicMessages(updatedUser.getAllowPublicMessages());

        return dto;
    }

    @Cacheable(value = "userStats", key = "#userId")
    public UserStatsDto getUserStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserStatsDto dto = new UserStatsDto();
        dto.setReputation(user.getReputation());
        dto.setFollowersCount(user.getFollowersCount());
        dto.setFollowingCount(user.getFollowingCount());
        dto.setQuestionsCount(user.getQuestionsCount());
        dto.setAnswersCount(user.getAnswersCount());

        return dto;
    }

    public SuggestionsDto getUserSuggestions(Long userId) {
        // Get top users by reputation who are NOT followed by current user
        List<User> topUsers = userRepository.findTopUsersNotFollowedBy(
                userId,
                org.springframework.data.domain.PageRequest.of(0, 10) // Fetch more to account for filtering
        );

        // Filter out system users (like Cue AI)
        List<UserProfileDto> suggestions = topUsers.stream()
                .filter(user -> !isSystemUser(user))
                .limit(5)
                .map(this::convertToUserProfileDto)
                .collect(Collectors.toList());

        SuggestionsDto dto = new SuggestionsDto();
        dto.setUsers(suggestions);

        return dto;
    }

    public org.springframework.data.domain.Page<UserProfileDto> searchUsers(String query, int page, int size) {
        org.springframework.data.domain.Page<User> users = userRepository.searchUsers(
                query,
                org.springframework.data.domain.PageRequest.of(page, size)
        );
        // Filter out system users from search results
        return users.map(user -> isSystemUser(user) ? null : convertToUserProfileDto(user));
    }

    /**
     * Check if a user is a system user (like Cue AI).
     * System users have emails ending with @qpoint.system
     */
    private boolean isSystemUser(User user) {
        return user.getEmail() != null && user.getEmail().endsWith("@qpoint.system");
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "userStats", key = "#followerId"),
        @CacheEvict(value = "userStats", key = "#followingId")
    })
    public void followUser(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            throw new RuntimeException("Cannot follow yourself");
        }

        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new RuntimeException("User to follow not found"));

        boolean alreadyFollowing = followRepository.existsByFollowerAndFollowing(follower, following);
        if (alreadyFollowing) {
            throw new RuntimeException("Already following this user");
        }

        // Create follow relationship
        com.example.Qpoint.models.Follow follow = new com.example.Qpoint.models.Follow();
        follow.setFollower(follower);
        follow.setFollowing(following);
        followRepository.save(follow);

        // Update counts
        follower.setFollowingCount(follower.getFollowingCount() + 1);
        following.setFollowersCount(following.getFollowersCount() + 1);

        userRepository.save(follower);
        userRepository.save(following);

        // Notify Target User (the one being followed)
        notificationService.createNotification(
                following.getUserId(), // Recipient is the user being followed
                follower.getUserId(),  // Initiator is the follower
                Notification.NotificationType.FOLLOW,
                follower.getUserId(),  // Reference ID can be follower ID
                follower.getFullName() + " followed you"
        );
    }

    public List<User> getUserFollowers(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Follow> follows = followRepository.findByFollowing(user);
        return follows.stream()
                .map(Follow::getFollower)
                .collect(Collectors.toList());
    }

    public boolean isFollowing(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) return false;
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));
        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return followRepository.existsByFollowerAndFollowing(follower, following);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "userStats", key = "#followerId"),
        @CacheEvict(value = "userStats", key = "#followingId")
    })
    public void unfollowUser(Long followerId, Long followingId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new RuntimeException("User to unfollow not found"));

        var follow = followRepository.findByFollowerAndFollowing(follower, following);
        if (follow.isEmpty()) {
            throw new RuntimeException("Not following this user");
        }

        followRepository.delete(follow.get());

        // Update counts
        follower.setFollowingCount(Math.max(0, follower.getFollowingCount() - 1));
        following.setFollowersCount(Math.max(0, following.getFollowersCount() - 1));

        userRepository.save(follower);
        userRepository.save(following);
    }

    public List<User> getUserFollowing(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Follow> follows = followRepository.findByFollower(user);
        return follows.stream()
                .map(Follow::getFollowing)
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeFollower(Long userId, Long followerId) {
        // userId is 'me', followerId is the person I want to remove from my followers
        User me = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        var follow = followRepository.findByFollowerAndFollowing(follower, me);
        if (follow.isEmpty()) {
            throw new RuntimeException("This user is not following you");
        }

        followRepository.delete(follow.get());

        // Update counts
        follower.setFollowingCount(Math.max(0, follower.getFollowingCount() - 1));
        me.setFollowersCount(Math.max(0, me.getFollowersCount() - 1));

        userRepository.save(follower);
        userRepository.save(me);
    }

    public UserProfileDto convertToUserProfileDto(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(user.getUserId());
        dto.setEmail(user.getEmail());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setBio(user.getBio());
        dto.setLocation(user.getLocation());
        dto.setJoinedAt(user.getCreatedAt());
        dto.setReputation(user.getReputation());
        dto.setFollowersCount(user.getFollowersCount());
        dto.setFollowingCount(user.getFollowingCount());
        dto.setQuestionsCount(user.getQuestionsCount());
        dto.setAnswersCount(user.getAnswersCount());
        dto.setSkills(user.getSkills());
        dto.setVerified(user.getVerified());
        dto.setAllowPublicMessages(user.getAllowPublicMessages());
        return dto;
    }
    @Transactional
    public void updateTopics(Long userId, List<String> topicNames) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Fetch or create topics
        java.util.Set<com.example.Qpoint.models.Topic> topics = new java.util.HashSet<>();
        if (topicNames != null && !topicNames.isEmpty()) {
            List<com.example.Qpoint.models.Topic> existingTopics = topicRepository.findByNameIn(topicNames);
            topics.addAll(existingTopics);

            // Create missing topics
            List<String> existingNames = existingTopics.stream().map(com.example.Qpoint.models.Topic::getName).collect(Collectors.toList());
            for (String name : topicNames) {
                if (!existingNames.contains(name)) {
                    com.example.Qpoint.models.Topic newTopic = com.example.Qpoint.models.Topic.builder()
                            .name(name)
                            .postCount(0)
                            .createdAt(java.time.Instant.now())
                            .build();
                    topics.add(topicRepository.save(newTopic));
                }
            }
        }

        user.setTopics(topics);
        // Sync skills list for backward compatibility
        user.setSkills(topicNames);

        userRepository.save(user);
    }
}