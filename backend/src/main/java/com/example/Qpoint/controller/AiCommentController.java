package com.example.Qpoint.controller;

import com.example.Qpoint.config.CustomUserDetails;
import com.example.Qpoint.dto.PostCommentDto;
import com.example.Qpoint.models.Comment;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.service.CommentService;
import com.example.Qpoint.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiCommentController {

    private final GeminiService geminiService;
    private final CommentService commentService;
    private final PostRepository postRepository;
    private final com.example.Qpoint.service.UserService userService;

    public AiCommentController(GeminiService geminiService, CommentService commentService,
                               PostRepository postRepository, com.example.Qpoint.service.UserService userService) {
        this.geminiService = geminiService;
        this.commentService = commentService;
        this.postRepository = postRepository;
        this.userService = userService;
    }

    /**
     * Generates an AI answer for a post.
     * Only the post owner can request an AI answer.
     */
    @PostMapping("/generate-answer/{postId}")
    public ResponseEntity<?> generateAiAnswer(@PathVariable Long postId, Authentication authentication) {
        // Validate authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid authentication"));
        }

        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User ID not found"));
        }

        // Check if Gemini is configured
        if (!geminiService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of("error", "AI service is not configured. Please contact administrator."));
        }

        // Fetch the post
        Post post = postRepository.findById(postId)
                .orElse(null);
        if (post == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Post not found"));
        }

        // Check if user is the post owner
        if (!post.getAuthor().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the post owner can request an AI answer"));
        }

        // Check if AI answer already exists
        if (commentService.hasAiComment(postId)) {
            return ResponseEntity.status(400).body(Map.of("error", "AI answer already exists for this post"));
        }

        try {
            // Generate AI answer
            String aiAnswer = geminiService.generateAnswer(post.getTitle(), post.getContent());

            // Get or create AI user
            User aiUser = userService.getOrCreateAiUser();

            // Create AI comment
            Comment aiComment = commentService.createAiComment(postId, aiUser, aiAnswer);

            // Convert to DTO and return
            PostCommentDto dto = commentService.convertToPostCommentDto(aiComment);
            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate AI answer: " + e.getMessage()));
        }
    }

    /**
     * Check if AI answer exists for a post.
     */
    @GetMapping("/has-answer/{postId}")
    public ResponseEntity<?> hasAiAnswer(@PathVariable Long postId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        try {
            boolean hasAiComment = commentService.hasAiComment(postId);
            return ResponseEntity.ok(Map.of("hasAiAnswer", hasAiComment));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Regenerates the AI answer for a post.
     * Deletes the existing AI answer and all its comments, then generates a new one.
     * Only the post owner can regenerate an AI answer.
     */
    @PostMapping("/regenerate-answer/{postId}")
    public ResponseEntity<?> regenerateAiAnswer(@PathVariable Long postId, Authentication authentication) {
        // Validate authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid authentication"));
        }

        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User ID not found"));
        }

        // Check if Gemini is configured
        if (!geminiService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of("error", "AI service is not configured. Please contact administrator."));
        }

        // Fetch the post
        Post post = postRepository.findById(postId).orElse(null);
        if (post == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Post not found"));
        }

        // Check if user is the post owner
        if (!post.getAuthor().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the post owner can regenerate an AI answer"));
        }

        // Check if AI answer exists
        if (!commentService.hasAiComment(postId)) {
            return ResponseEntity.status(400).body(Map.of("error", "No AI answer exists to regenerate. Generate one first."));
        }

        try {
            // Delete the existing AI comment and all its replies
            commentService.deleteAiComment(postId);

            // Generate new AI answer
            String aiAnswer = geminiService.generateAnswer(post.getTitle(), post.getContent());

            // Get or create AI user
            User aiUser = userService.getOrCreateAiUser();

            // Create new AI comment
            Comment aiComment = commentService.createAiComment(postId, aiUser, aiAnswer);

            // Convert to DTO and return
            PostCommentDto dto = commentService.convertToPostCommentDto(aiComment);
            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to regenerate AI answer: " + e.getMessage()));
        }
    }


}
