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
    private final com.example.Qpoint.repository.PostRepository postRepository;
    private final FileStorageService fileStorageService;

    public UserService(UserRepository userRepository, FollowRepository followRepository,
            PasswordEncoder passwordEncoder, NotificationService notificationService,
            com.example.Qpoint.repository.TopicRepository topicRepository,
            com.example.Qpoint.repository.PostRepository postRepository, FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.followRepository = followRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.topicRepository = topicRepository;
        this.postRepository = postRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#userId")
    public UserProfileDto getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToUserProfileDto(user);
    }

    @Transactional(readOnly = true)
    public UserProfileDto getUserProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToUserProfileDto(user);
    }

    public boolean isUsernameTaken(String username) {
        return userRepository.existsByUsername(username);
    }

    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
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
            // Delete old avatar from Cloudinary if it exists and is different
            String oldAvatarUrl = user.getAvatarUrl();
            if (oldAvatarUrl != null && !oldAvatarUrl.isEmpty() && !oldAvatarUrl.equals(request.getAvatarUrl())) {
                fileStorageService.deleteFromCloudinary(oldAvatarUrl);
            }
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
        dto.setSkills(updatedUser.getSkills() != null ? new java.util.ArrayList<>(updatedUser.getSkills()) : null);
        dto.setAllowPublicMessages(updatedUser.getAllowPublicMessages());
        dto.setTopics(updatedUser.getTopics() != null ? new java.util.HashSet<>(updatedUser.getTopics()) : null);

        return dto;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "users", key = "#userId"),
            @CacheEvict(value = "userStats", key = "#userId")
    })
    public void removeProfilePicture(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String avatarUrl = user.getAvatarUrl();
        if (avatarUrl != null) {
            fileStorageService.delete(avatarUrl);
        }

        user.setAvatarUrl(null);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "userStats", key = "#userId")
    public UserStatsDto getUserStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserStatsDto dto = new UserStatsDto();
        dto.setReputation(user.getReputation());
        // Calculate counts dynamically from database
        dto.setFollowersCount((int) followRepository.countByFollowing(user));
        dto.setFollowingCount((int) followRepository.countByFollower(user));
        dto.setQuestionsCount((int) postRepository.countByAuthor(user));
        dto.setAnswersCount(user.getAnswersCount());

        return dto;
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<UserProfileDto> searchUsers(String query, int page, int size) {
        org.springframework.data.domain.Page<User> users = userRepository.searchUsers(
                query,
                org.springframework.data.domain.PageRequest.of(page, size));
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
            @CacheEvict(value = "userStats", key = "#followingId"),
            // Evict 'following' list of the follower
            @CacheEvict(value = "userConnections", key = "#followerId + ':following'"),
            // Evict 'followers' list of the following user
            @CacheEvict(value = "userConnections", key = "#followingId + ':followers'")
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
                follower.getUserId(), // Initiator is the follower
                Notification.NotificationType.FOLLOW,
                follower.getUserId(), // Reference ID can be follower ID
                follower.getFullName() + " followed you");
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "userConnections", key = "#userId + ':followers'")
    public List<UserProfileDto> getUserFollowers(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Follow> follows = followRepository.findByFollowing(user);

        List<UserProfileDto> dtos = follows.stream()
                .map(f -> convertToUserProfileDto(f.getFollower()))
                .collect(Collectors.toList());

        if (currentUserId != null) {
            populateFollowStatus(dtos, currentUserId);
        }

        return dtos;
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(Long followerId, Long followingId) {
        if (followerId.equals(followingId))
            return false;
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));
        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return followRepository.existsByFollowerAndFollowing(follower, following);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "userStats", key = "#followerId"),
            @CacheEvict(value = "userStats", key = "#followingId"),
            // Evict 'following' list of the follower
            @CacheEvict(value = "userConnections", key = "#followerId + ':following'"),
            // Evict 'followers' list of the following user
            @CacheEvict(value = "userConnections", key = "#followingId + ':followers'")
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

    @Transactional(readOnly = true)
    @Cacheable(value = "userConnections", key = "#userId + ':following'")
    public List<UserProfileDto> getUserFollowing(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Follow> follows = followRepository.findByFollower(user);

        List<UserProfileDto> dtos = follows.stream()
                .map(f -> convertToUserProfileDto(f.getFollowing()))
                .collect(Collectors.toList());

        if (currentUserId != null) {
            populateFollowStatus(dtos, currentUserId);
        }

        return dtos;
    }

    private void populateFollowStatus(List<UserProfileDto> users, Long currentUserId) {
        if (users.isEmpty())
            return;
        User currentUser = userRepository.findById(currentUserId).orElse(null);
        if (currentUser == null)
            return;

        // Optimize: Fetch all follows from current user to the target users in one
        // query
        // But for simplicity/correctness first:
        // Or simpler: Get local list of IDs I follow?
        // Let's iterate for now or use `followRepository.findByFollower` logic if list
        // is large.
        // Better:
        // Set<Long> userIds =
        // users.stream().map(UserProfileDto::getUserId).collect(Collectors.toSet());
        // List<Follow> myFollows =
        // followRepository.findByFollowerAndFollowingIdIn(currentUser, userIds);
        // Set<Long> followedIds = myFollows.stream().map(f ->
        // f.getFollowing().getUserId()).collect(Collectors.toSet());
        // users.forEach(u -> u.setIsFollowing(followedIds.contains(u.getUserId())));

        // Since I don't want to modify Repository right now without reading it, I'll
        // fallback to N+1 safe check or assuming list is small (pagination 10-30).
        // Actually, let's use the individual check for simplicity if we can't easily
        // add repo method.
        // Wait, `convertToUserProfileDto` could just take `currentUser`? No.

        // Let's do the looped check for now. It is N queries if not batching, but page
        // size is small.
        // Alternatively, fetch ALL my followings (might be large).

        // Let's go with the loop for this iteration, it's safer logic-wise without repo
        // changes.
        // Performance note: If this is slow, I'll recommend batch fetching in next
        // iteration.

        for (UserProfileDto dto : users) {
            if (dto.getUserId().equals(currentUserId)) {
                dto.setIsFollowing(false); // Can't follow self
            } else {
                dto.setIsFollowing(followRepository.existsByFollowerAndFollowing(currentUser,
                        userRepository.getReferenceById(dto.getUserId())));
            }
        }
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "userStats", key = "#userId"),
            @CacheEvict(value = "userStats", key = "#followerId"),
            @CacheEvict(value = "userConnections", key = "#userId + ':followers'"),
            @CacheEvict(value = "userConnections", key = "#followerId + ':following'")
    })
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

    @Transactional(readOnly = true)
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
        // Create a defensive copy of skills to avoid LazyInitializationException after
        // transaction closes
        dto.setSkills(user.getSkills() != null ? new java.util.ArrayList<>(user.getSkills()) : null);
        dto.setAllowPublicMessages(user.getAllowPublicMessages());
        dto.setRole(user.getRole());
        dto.setTopics(user.getTopics() != null ? new java.util.HashSet<>(user.getTopics()) : null);
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
            List<String> existingNames = existingTopics.stream().map(com.example.Qpoint.models.Topic::getName)
                    .collect(Collectors.toList());
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

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "users", key = "#userId")
    })
    public void followTopic(Long userId, Long topicId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        com.example.Qpoint.models.Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found"));

        user.getTopics().add(topic);
        // Also add to skills for backward compatibility if not present
        if (user.getSkills() == null) {
            user.setSkills(new java.util.ArrayList<>());
        }
        if (!user.getSkills().contains(topic.getName())) {
            user.getSkills().add(topic.getName());
        }

        userRepository.save(user);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "users", key = "#userId")
    })
    public void unfollowTopic(Long userId, Long topicId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        com.example.Qpoint.models.Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found"));

        // Initialize collection to avoid LazyInitializationException
        java.util.Set<com.example.Qpoint.models.Topic> topics = user.getTopics();
        if (topics != null) {
            topics.size(); // Force initialization
            topics.remove(topic);
        }

        // Also remove from skills for backward compatibility
        if (user.getSkills() != null) {
            user.getSkills().size(); // Force initialization
            user.getSkills().remove(topic.getName());
        }

        userRepository.save(user);
    }
    // AI User Constants
    public static final String AI_USER_EMAIL = "cue@qpoint.system";
    public static final String AI_USER_USERNAME = "cue";
    public static final String AI_USER_FULLNAME = "Cue";

    /**
     * Gets or creates the system AI user account.
     */
    @Transactional
    public User getOrCreateAiUser() {
        return userRepository.findByEmail(AI_USER_EMAIL)
                .orElseGet(() -> {
                    User aiUser = User.builder()
                            .email(AI_USER_EMAIL)
                            .username(AI_USER_USERNAME)
                            .fullName(AI_USER_FULLNAME)
                            .passwordHash("$AI_SYSTEM_USER$") // Not a valid password, prevents login
                            .allowPublicMessages(false)
                            .reputation(0)
                            .followersCount(0)
                            .followingCount(0)
                            .questionsCount(0)
                            .answersCount(0)
                            .createdAt(java.time.Instant.now())
                            .updatedAt(java.time.Instant.now())
                            .build();
                    return userRepository.save(aiUser);
                });
    }
}