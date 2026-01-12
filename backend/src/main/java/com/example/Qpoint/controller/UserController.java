package com.example.Qpoint.controller;

import com.example.Qpoint.dto.UserProfileDto;
import com.example.Qpoint.dto.UserStatsDto;
import com.example.Qpoint.dto.SuggestionsDto;
import com.example.Qpoint.service.UserService;
import com.example.Qpoint.service.PostService;
import com.example.Qpoint.service.AnswerService;
import com.example.Qpoint.dto.FeedPostDto;
import com.example.Qpoint.dto.AnswerResponseDto;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import com.example.Qpoint.config.CustomUserDetails;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PostService postService;
    private final AnswerService answerService;

    public UserController(UserService userService, PostService postService, AnswerService answerService) {
        this.userService = userService;
        this.postService = postService;
        this.answerService = answerService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        UserProfileDto user = userService.getUserProfile(userId);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getUserProfile(@PathVariable String id) {
        UserProfileDto user;
        try {
            Long userId = Long.parseLong(id);
            user = userService.getUserProfile(userId);
        } catch (NumberFormatException e) {
            user = userService.getUserProfileByUsername(id);
        }
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileDto> updateProfile(@RequestBody UpdateProfileRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        UserProfileDto updatedUser = userService.updateUserProfile(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/me/topics")
    public ResponseEntity<Void> updateTopics(@RequestBody TopicUpdateRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        userService.updateTopics(userId, request.getTopics());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<UserStatsDto> getUserStats(@PathVariable Long id) {
        UserStatsDto stats = userService.getUserStats(id);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/suggestions")
    public ResponseEntity<SuggestionsDto> getUserSuggestions(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        SuggestionsDto suggestions = userService.getUserSuggestions(userId);
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<Void> followUser(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long followerId = ((CustomUserDetails) principal).getUserId();
        if (followerId == null) {
            return ResponseEntity.status(401).build();
        }
        
        userService.followUser(followerId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/follow")
    public ResponseEntity<Void> unfollowUser(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long followerId = ((CustomUserDetails) principal).getUserId();
        if (followerId == null) {
            return ResponseEntity.status(401).build();
        }
        
        userService.unfollowUser(followerId, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/follow/status")
    public ResponseEntity<Boolean> getFollowStatus(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long followerId = ((CustomUserDetails) principal).getUserId();
        if (followerId == null) {
            return ResponseEntity.status(401).build();
        }
        
        return ResponseEntity.ok(userService.isFollowing(followerId, id));
    }

    @GetMapping("/{id}/followers")
    public ResponseEntity<List<UserProfileDto>> getUserFollowers(@PathVariable Long id) {
        List<com.example.Qpoint.models.User> followers = userService.getUserFollowers(id);
        List<UserProfileDto> followerDtos = followers.stream()
                .map(userService::convertToUserProfileDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(followerDtos);
    }

    @GetMapping("/{id}/following")
    public ResponseEntity<List<UserProfileDto>> getUserFollowing(@PathVariable Long id) {
        List<com.example.Qpoint.models.User> following = userService.getUserFollowing(id);
        List<UserProfileDto> followingDtos = following.stream()
                .map(userService::convertToUserProfileDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(followingDtos);
    }

    @DeleteMapping("/me/followers/{followerId}")
    public ResponseEntity<Void> removeFollower(@PathVariable Long followerId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        userService.removeFollower(userId, followerId);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{id}/questions")
    public ResponseEntity<Page<FeedPostDto>> getUserQuestions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<FeedPostDto> questions = postService.getUserQuestions(id, page, size);
        return ResponseEntity.ok(questions);
    }
    
    @GetMapping("/{id}/answers")
    public ResponseEntity<Page<AnswerResponseDto>> getUserAnswers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<AnswerResponseDto> answers = answerService.getUserAnswers(id, page, size);
        return ResponseEntity.ok(answers);
    }
    
    @GetMapping("/search")
    public ResponseEntity<Page<UserProfileDto>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<UserProfileDto> users = userService.searchUsers(query, page, size);
        return ResponseEntity.ok(users);
    }
    
    // DTO for update profile request
    public static class UpdateProfileRequest {
        private String fullName;
        private String avatarUrl;
        private String bio;
        private String location;
        private String username;
        private Boolean allowPublicMessages;
        
        // Getters and setters
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        public String getBio() { return bio; }
        public void setBio(String bio) { this.bio = bio; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public Boolean getAllowPublicMessages() { return allowPublicMessages; }
        public void setAllowPublicMessages(Boolean allowPublicMessages) { this.allowPublicMessages = allowPublicMessages; }
    }
    
    public static class TopicUpdateRequest {
        private List<String> topics;
        public List<String> getTopics() { return topics; }
        public void setTopics(List<String> topics) { this.topics = topics; }
    }
}