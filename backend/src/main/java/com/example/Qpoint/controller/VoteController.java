package com.example.Qpoint.controller;

import com.example.Qpoint.models.Vote;
import com.example.Qpoint.service.VoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import com.example.Qpoint.config.CustomUserDetails;

@RestController
@RequestMapping("/api/votes")
public class VoteController {

    private final VoteService voteService;

    public VoteController(VoteService voteService) {
        this.voteService = voteService;
    }

    @PostMapping("/questions/{questionId}")
    public ResponseEntity<Vote> voteQuestion(@PathVariable Long questionId,
                                           @RequestParam Vote.VoteType voteType,
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
        
        Vote vote = voteService.voteQuestion(userId, questionId, voteType);
        return ResponseEntity.ok(vote);
    }

    @PostMapping("/comments/{commentId}")
    public ResponseEntity<Vote> voteComment(@PathVariable Long commentId,
                                          @RequestParam Vote.VoteType voteType,
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
        
        Vote vote = voteService.voteComment(userId, commentId, voteType);
        return ResponseEntity.ok(vote);
    }

    @GetMapping("/questions/{questionId}/status")
    public ResponseEntity<Vote.VoteType> getQuestionVoteStatus(@PathVariable Long questionId,
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
        
        Vote.VoteType voteType = voteService.getUserVoteType(userId, questionId, Vote.EntityType.QUESTION);
        return ResponseEntity.ok(voteType != null ? voteType : Vote.VoteType.NONE);
    }

    @GetMapping("/comments/{commentId}/status")
    public ResponseEntity<Vote.VoteType> getCommentVoteStatus(@PathVariable Long commentId,
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
        
        Vote.VoteType voteType = voteService.getUserVoteType(userId, commentId, Vote.EntityType.COMMENT);
        return ResponseEntity.ok(voteType != null ? voteType : Vote.VoteType.NONE);
    }

    @GetMapping("/questions/{questionId}/counts")
    public ResponseEntity<VoteCounts> getQuestionVoteCounts(@PathVariable Long questionId) {
        long upvotes = voteService.getUpvoteCount(Vote.EntityType.QUESTION, questionId);
        long downvotes = voteService.getDownvoteCount(Vote.EntityType.QUESTION, questionId);
        return ResponseEntity.ok(new VoteCounts(upvotes, downvotes));
    }

    @GetMapping("/comments/{commentId}/counts")
    public ResponseEntity<VoteCounts> getCommentVoteCounts(@PathVariable Long commentId) {
        long upvotes = voteService.getUpvoteCount(Vote.EntityType.COMMENT, commentId);
        long downvotes = voteService.getDownvoteCount(Vote.EntityType.COMMENT, commentId);
        return ResponseEntity.ok(new VoteCounts(upvotes, downvotes));
    }

    // Helper class for vote counts response
    public static class VoteCounts {
        private long upvotes;
        private long downvotes;

        public VoteCounts(long upvotes, long downvotes) {
            this.upvotes = upvotes;
            this.downvotes = downvotes;
        }

        public long getUpvotes() {
            return upvotes;
        }

        public long getDownvotes() {
            return downvotes;
        }
    }
}