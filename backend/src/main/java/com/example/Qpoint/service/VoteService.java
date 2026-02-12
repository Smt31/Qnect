package com.example.Qpoint.service;

import com.example.Qpoint.models.*;
import com.example.Qpoint.repository.CommentRepository;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class VoteService {

    private final VoteRepository voteRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService; // Added NotificationService
    private final org.springframework.cache.CacheManager cacheManager;

    public VoteService(VoteRepository voteRepository, PostRepository postRepository, 
                      CommentRepository commentRepository, UserRepository userRepository,
                      NotificationService notificationService, org.springframework.cache.CacheManager cacheManager) { // Added NotificationService to constructor
        this.voteRepository = voteRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService; // Initialized NotificationService
        this.cacheManager = cacheManager;
    }

    @Transactional
    public Vote voteQuestion(Long userId, Long questionId, Vote.VoteType voteType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Optional<Vote> existingVoteOpt = voteRepository.findByUserIdAndEntityTypeAndEntityId(
                userId, Vote.EntityType.QUESTION, questionId);

        if (existingVoteOpt.isPresent()) {
            Vote primaryVote = existingVoteOpt.get();

            if (primaryVote.getVoteType() == voteType) {
                removeVote(primaryVote, post, Vote.EntityType.QUESTION, user); // Pass user
                return null;
            } else {
                updateVote(primaryVote, voteType, post, Vote.EntityType.QUESTION, user); // Pass user
                return primaryVote;
            }
        } else {
            Vote vote = Vote.builder()
                    .user(user)
                    .entityType(Vote.EntityType.QUESTION)
                    .entityId(questionId)
                    .voteType(voteType)
                    .build();
            vote = voteRepository.save(vote);
            updateEntityVotes(post, voteType, Vote.EntityType.QUESTION, true, user); // Pass user
            return vote;
        }
    }



    @Transactional
    public Vote voteComment(Long userId, Long commentId, Vote.VoteType voteType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        java.util.List<Vote> existingVotes = voteRepository.findAllByUserAndEntityTypeAndEntityId(
                user, Vote.EntityType.COMMENT, commentId);

        if (!existingVotes.isEmpty()) {
            Vote primaryVote = existingVotes.get(0);
            if (existingVotes.size() > 1) {
                for (int i = 1; i < existingVotes.size(); i++) {
                    removeVote(existingVotes.get(i), comment, Vote.EntityType.COMMENT, user); // Pass user
                }
            }

            if (primaryVote.getVoteType() == voteType) {
                removeVote(primaryVote, comment, Vote.EntityType.COMMENT, user); // Pass user
                return null;
            } else {
                updateVote(primaryVote, voteType, comment, Vote.EntityType.COMMENT, user); // Pass user
                return primaryVote;
            }
        } else {
            Vote vote = Vote.builder()
                    .user(user)
                    .entityType(Vote.EntityType.COMMENT)
                    .entityId(commentId)
                    .voteType(voteType)
                    .build();
            vote = voteRepository.save(vote);
            updateEntityVotes(comment, voteType, Vote.EntityType.COMMENT, true, user); // Pass user
            return vote;
        }
    }

    private void removeVote(Vote vote, Object entity, Vote.EntityType entityType, User voter) { // Added User voter
        // Delete the vote first to avoid constraint issues
        voteRepository.delete(vote);
        // Then update the entity vote count
        updateEntityVotes(entity, vote.getVoteType(), entityType, false, voter); // Pass voter
    }

    private void updateVote(Vote vote, Vote.VoteType newType, Object entity, Vote.EntityType entityType, User voter) { // Added User voter
        // Remove old vote effect
        updateEntityVotes(entity, vote.getVoteType(), entityType, false, voter); // Pass voter
        // Add new vote effect
        vote.setVoteType(newType);
        voteRepository.save(vote);
        updateEntityVotes(entity, newType, entityType, true, voter); // Pass voter
    }

    private void updateEntityVotes(Object entity, Vote.VoteType voteType, Vote.EntityType entityType, boolean isAdding, User voter) { // Added User voter
        int multiplier = isAdding ? 1 : -1;
        
        if (entityType == Vote.EntityType.QUESTION && entity instanceof Post) {
            Post post = (Post) entity;
            if (voteType == Vote.VoteType.UPVOTE) {
                post.setUpvotes(post.getUpvotes() + (1 * multiplier));
                
                // Handle reputation for upvotes: +2 when adding, -2 when removing
                User postAuthor = post.getAuthor();
                int reputationChange = 2 * multiplier;
                postAuthor.setReputation(Math.max(0, postAuthor.getReputation() + reputationChange));
                userRepository.save(postAuthor);
            } else if (voteType == Vote.VoteType.DOWNVOTE) {
                post.setDownvotes(post.getDownvotes() + (1 * multiplier));
            }
            postRepository.save(post);

            // Milestone notification logic
            if (isAdding && voteType == Vote.VoteType.UPVOTE && post.getUpvotes() > 0 && post.getUpvotes() % 25 == 0) {
                notificationService.createNotification(
                    post.getAuthor().getUserId(),
                    voter.getUserId(), // Triggered by this voter
                    Notification.NotificationType.VOTE_QUESTION,
                    post.getId(),
                    "Your post \"" + post.getTitle() + "\" reached " + post.getUpvotes() + " upvotes!"
                );
            }
        } else if (entityType == Vote.EntityType.COMMENT && entity instanceof Comment) {
            Comment comment = (Comment) entity;
            if (voteType == Vote.VoteType.UPVOTE) {
                comment.setUpvotes(comment.getUpvotes() + (1 * multiplier));
                
                // Handle reputation for upvotes: +2 when adding, -2 when removing
                User commentAuthor = comment.getAuthor();
                int reputationChange = 2 * multiplier;
                commentAuthor.setReputation(Math.max(0, commentAuthor.getReputation() + reputationChange));
                userRepository.save(commentAuthor);
            } else if (voteType == Vote.VoteType.DOWNVOTE) {
                comment.setDownvotes(comment.getDownvotes() + (1 * multiplier));
            }
            commentRepository.save(comment);
            evictCommentStructureCache(comment.getPost().getId());
        }
    }

    private void evictCommentStructureCache(Long postId) {
        if (cacheManager != null) {
            org.springframework.cache.Cache cache = cacheManager.getCache("comments");
            if (cache != null) {
                // Evict the most likely cached page: Page 0 with default size 10
                cache.evict(postId + ":0:10"); 
            }
        }
    }

    public boolean isEntityVotedByUser(Long userId, Long entityId, Vote.EntityType entityType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return voteRepository.findByUserAndEntityTypeAndEntityId(user, entityType, entityId).isPresent();
    }

    public Vote.VoteType getUserVoteType(Long userId, Long entityId, Vote.EntityType entityType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Optional<Vote> vote = voteRepository.findByUserAndEntityTypeAndEntityId(user, entityType, entityId);
        
        if (vote.isPresent()) {
            return vote.get().getVoteType();
        }
        return null;
    }

    public long getUpvoteCount(Vote.EntityType entityType, Long entityId) {
        return voteRepository.countUpvotesByEntityTypeAndEntityId(entityType, entityId);
    }

    public long getDownvoteCount(Vote.EntityType entityType, Long entityId) {
        return voteRepository.countDownvotesByEntityTypeAndEntityId(entityType, entityId);
    }

    public VoteCountsDto getVoteCounts(Vote.EntityType entityType, Long entityId) {
        long upvotes = voteRepository.countUpvotesByEntityTypeAndEntityId(entityType, entityId);
        long downvotes = voteRepository.countDownvotesByEntityTypeAndEntityId(entityType, entityId);
        return new VoteCountsDto(upvotes, downvotes);
    }

    // Helper DTO for explicit method if needed, or stick to simple counts
    public record VoteCountsDto(long upvotes, long downvotes) {}
}