package com.example.Qpoint.controller;

import com.example.Qpoint.dto.FeedPostDto;
import com.example.Qpoint.dto.FeedResponseDto;
import com.example.Qpoint.dto.UserProfileDto;
import com.example.Qpoint.dto.SuggestionsDto;
import com.example.Qpoint.models.Topic;
import com.example.Qpoint.service.PostService;
import com.example.Qpoint.service.UserService;
import com.example.Qpoint.service.TopicService;
import com.example.Qpoint.config.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.Authentication;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
public class FeedController {

    private final PostService postService;
    private final UserService userService;
    private final TopicService topicService;

    public FeedController(
            PostService postService,
            UserService userService,
            TopicService topicService
    ) {
        this.postService = postService;
        this.userService = userService;
        this.topicService = topicService;
    }

    @GetMapping({"/feed", "/home/questions"})
    public ResponseEntity<FeedResponseDto> getFeed(
            Authentication authentication,
            @RequestParam(value = "tab", defaultValue = "FOR_YOU") String tabStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PostService.FeedTab tab;
        try {
            tab = PostService.FeedTab.valueOf(tabStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            tab = PostService.FeedTab.FOR_YOU; // Default fallback
        }

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        try {
            Long userId;
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                userId = ((CustomUserDetails) principal).getUserId();
                // If userId is null, the token might be invalid
                if (userId == null) {
                    return ResponseEntity.status(401).build();
                }
            } else {
                return ResponseEntity.status(401).build(); // Invalid principal type
            }

            UserProfileDto currentUser = userService.getUserProfile(userId);

            Page<FeedPostDto> feedPosts =
                    postService.getFeedForUser(userId, tab, page, size);

            Page<FeedPostDto> trendingPosts =
                    postService.getTrendingPosts(page, 5, userId);

            SuggestionsDto suggestions =
                    userService.getUserSuggestions(userId);

            FeedResponseDto response = new FeedResponseDto();
            response.setUser(currentUser);
            response.setFeed(new ArrayList<>(feedPosts.getContent()));
            response.setTrending(new ArrayList<>(trendingPosts.getContent()));
            response.setSuggestions(suggestions);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error in getFeed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/trending")
    public ResponseEntity<com.example.Qpoint.dto.PageDto<FeedPostDto>> getTrending(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Long userId = null;
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                userId = ((CustomUserDetails) principal).getUserId();
                // If userId is null, the token might be invalid, but for trending we can proceed with null
                if (userId == null) {
                    userId = null; // Reset to null if extraction failed
                }
            }
        }

        Page<FeedPostDto> trendingPosts =
                postService.getTrendingPosts(page, size, userId);

        return ResponseEntity.ok(new com.example.Qpoint.dto.PageDto<>(trendingPosts));
    }

    @GetMapping("/topics/trending")
    public ResponseEntity<List<Topic>> getTrendingTopics() {
        List<Topic> topics = topicService.getTrendingTopics(10);
        return ResponseEntity.ok(topics);
    }

    @GetMapping("/questions/trending")
    public ResponseEntity<List<FeedPostDto>> getTrendingQuestions(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Long userId = null;
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                userId = ((CustomUserDetails) principal).getUserId();
                // If userId is null, the token might be invalid, but for trending we can proceed with null
                if (userId == null) {
                    userId = null; // Reset to null if extraction failed
                }
            }
        }

        Page<FeedPostDto> trendingPosts =
                postService.getTrendingPosts(page, size, userId);

        return ResponseEntity.ok(trendingPosts.getContent());
    }
}
