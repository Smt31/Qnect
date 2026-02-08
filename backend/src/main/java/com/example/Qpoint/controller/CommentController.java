package com.example.Qpoint.controller;

import com.example.Qpoint.dto.CreateCommentRequest;
import com.example.Qpoint.dto.PostCommentDto;
import com.example.Qpoint.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.Authentication;
import com.example.Qpoint.config.CustomUserDetails;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/post/{postId}")
    public ResponseEntity<PostCommentDto> createComment(@PathVariable Long postId,
                                                         @Valid @RequestBody CreateCommentRequest request,
                                                         Authentication authentication) {
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
        
        var saved = commentService.createComment(postId, userId, request);
        return ResponseEntity.ok(commentService.convertToPostCommentDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PostCommentDto> updateComment(@PathVariable Long id,
                                                         @Valid @RequestBody CreateCommentRequest request,
                                                         Authentication authentication) {
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
        
        var updated = commentService.updateComment(id, userId, request);
        return ResponseEntity.ok(commentService.convertToPostCommentDto(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id, Authentication authentication) {
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
        
        commentService.deleteComment(id, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<com.example.Qpoint.dto.PageDto<PostCommentDto>> getCommentsForPost(@PathVariable Long postId,
                                                                    @RequestParam(defaultValue = "0") int page,
                                                                    @RequestParam(defaultValue = "10") int size,
                                                                    Authentication authentication) {
        Long currentUserId = null;
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof CustomUserDetails) {
            currentUserId = ((CustomUserDetails) authentication.getPrincipal()).getUserId();
        }
        return ResponseEntity.ok(commentService.getCommentsForPost(postId, page, size, currentUserId));
    }
}
