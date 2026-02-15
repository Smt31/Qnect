package com.example.Qpoint.service;

import com.example.Qpoint.dto.CreateCommentRequest;
import com.example.Qpoint.dto.PostCommentDto;
import com.example.Qpoint.models.Comment;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.CommentRepository;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.Qpoint.models.Notification;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Collections;
import java.util.ArrayList;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.example.Qpoint.repository.VoteRepository voteRepository;
    private final GeminiService geminiService;
    private final UserService userService;

    private final org.springframework.cache.CacheManager cacheManager;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository, UserRepository userRepository, NotificationService notificationService, org.springframework.cache.CacheManager cacheManager, com.example.Qpoint.repository.VoteRepository voteRepository, GeminiService geminiService, UserService userService) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.cacheManager = cacheManager;
        this.voteRepository = voteRepository;
        this.geminiService = geminiService;
        this.userService = userService;
    }
    
    // ... [createComment and updateComment code remains from previous step, but I need to handle deleteComment correctly]
    


    @Transactional
    // We cannot easily evict all pages with annotations, so we will use manual eviction for the most common page (0).
    // Stale data on deeper pages (rarely deep) will expire by TTL (15m).
    public Comment createComment(Long postId, Long authorId, CreateCommentRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.getContent());

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParent(parent);
        }

        // Logic to extract mentions (simple regex)
        // String text = request.getContent();
        // Matcher matcher = Pattern.compile("@(\\w+)").matcher(text);
        // while (matcher.find()) {
        //     String username = matcher.group(1);
        //     userRepository.findByUsername(username).ifPresent(user -> {
        //         // TODO: Send notification
        //     });
        // }

        Comment savedComment = commentRepository.save(comment);

        // Increment comment count on post (only for top-level comments? or all? usually all)
        post.setCommentsCount(post.getCommentsCount() + 1);
        // post.setAnswerCount(post.getAnswerCount() + 1); // Only for Answers entity now
        postRepository.save(post); // Corrected from commentRepository.save(comment) to postRepository.save(post)

        // Notify Post Author
        notificationService.createNotification(
            post.getAuthor().getUserId(),
            author.getUserId(),
            Notification.NotificationType.COMMENT_POST,
            post.getId(),
            author.getFullName() + " commented on your post: " + post.getTitle()
        );

        // Notify parent comment author if this is a reply
        if (comment.getParent() != null && !comment.getParent().getAuthor().getUserId().equals(author.getUserId())) {
            notificationService.createNotification(
                comment.getParent().getAuthor().getUserId(),
                author.getUserId(),
                Notification.NotificationType.COMMENT_REPLY,
                comment.getParent().getId(),
                author.getFullName() + " replied to your comment on post: " + post.getTitle()
            );
        }

        // @cue AI Integration
        String content = request.getContent();
        if (content != null && content.toLowerCase().contains("@cue")) {
            // Extract the query (everything after @cue or the whole message if it's mixed)
            // Ideally, we treat the whole comment as the query context.
            
            // 1. Fetch Context (Limit to recent 50 comments)
            Pageable contextPage = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<Comment> recentComments = commentRepository.findByPostOrderByCreatedAtDesc(post, contextPage);
            List<Comment> contextList = recentComments.getContent();

            // 2. Generate AI Reply
            try {
                String aiReplyContent = geminiService.generateContextAwareReply(post, contextList, content);
                
                // 3. Create AI Comment
                User aiUser = userService.getOrCreateAiUser();
                Comment aiComment = new Comment();
                aiComment.setPost(post);
                aiComment.setAuthor(aiUser);
                aiComment.setContent(aiReplyContent);
                aiComment.setIsAiGenerated(true);
                // Reply to the user's comment to keep thread clean
                aiComment.setParent(savedComment); 
                
                commentRepository.save(aiComment);
                
                // Update post stats again
                post.setCommentsCount(post.getCommentsCount() + 1);
                postRepository.save(post);
                
            } catch (Exception e) {
                System.err.println("Failed to generate @cue reply: " + e.getMessage());
                // Don't fail the user's comment creation just because AI failed
            }
        }

        evictFirstPageComments(postId);

        return savedComment; // Kept original return type as Comment, not PostCommentDto
    }

    private void evictFirstPageComments(Long postId) {
        if (cacheManager != null) {
            var cache = cacheManager.getCache("comments");
            if (cache != null) {
                // Evict the most likely cached page: Page 0 with default size 10 (and maybe 20/5 used by frontend?)
                // Current frontend uses default (likely 10 or hardcoded).
                cache.evict(postId + ":0:10"); 
                // Add commonly used sizes if needed, or rely on TTL for others.
            }
        }
    }

    @Transactional
    // @org.springframework.cache.annotation.CacheEvict(value = "comments", key = "#result.post.id") --> replaced by manual
    public Comment updateComment(Long commentId, Long userId, CreateCommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to update this comment");
        }

        comment.setContent(request.getContent());
        Comment saved = commentRepository.save(comment);
        
        evictFirstPageComments(saved.getPost().getId());
        
        return saved;
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getUserId().equals(userId) && !comment.getPost().getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }
        
        Long postId = comment.getPost().getId();

        // Decrement comment count on post
        Post post = comment.getPost();
        post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
        postRepository.save(post);

        commentRepository.delete(comment);
        
        evictFirstPageComments(postId);
    }



    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "comments", key = "#postId + ':' + #page + ':' + #size")
    public com.example.Qpoint.dto.PageDto<PostCommentDto> getCommentsStructure(Long postId, int page, int size) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        // Only return top-level comments
        Page<Comment> comments = commentRepository.findByPostAndParentIsNullOrderByCreatedAtDesc(post, pageable);
        
        // Convert with null userId implies no vote status (all "NONE")
        return new com.example.Qpoint.dto.PageDto<>(convertToPostCommentDtoBulk(comments, null));
    }

    @Transactional(readOnly = true)
    public com.example.Qpoint.dto.PageDto<PostCommentDto> getCommentsForPost(Long postId, int page, int size, Long currentUserId) {
        // 1. Get cached structure (votes are NONE)
        com.example.Qpoint.dto.PageDto<PostCommentDto> pageDto = getCommentsStructure(postId, page, size);
        
        // 2. If user is logged in, populate real votes
        if (currentUserId != null && pageDto.getContent() != null && !pageDto.getContent().isEmpty()) {
            populateVotesForPage(pageDto, currentUserId);
        }
        
        return pageDto;
    }

    private void populateVotesForPage(com.example.Qpoint.dto.PageDto<PostCommentDto> pageDto, Long currentUserId) {
        // Collect all comment IDs recursively
        java.util.List<Long> allCommentIds = new java.util.ArrayList<>();
        for (PostCommentDto dto : pageDto.getContent()) {
            collectDtoIds(dto, allCommentIds);
        }

        if (allCommentIds.isEmpty()) return;

        User user = userRepository.getReferenceById(currentUserId);
        java.util.List<com.example.Qpoint.models.Vote> votes = voteRepository.findAllByUserAndEntityTypeAndEntityIdIn(
                user, com.example.Qpoint.models.Vote.EntityType.COMMENT, allCommentIds);

        java.util.Map<Long, String> voteMap = votes.stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.example.Qpoint.models.Vote::getEntityId,
                        v -> v.getVoteType().name(),
                        (a, b) -> a));

        // Update DTOs
        for (PostCommentDto dto : pageDto.getContent()) {
            updateDtoVotes(dto, voteMap);
        }
    }

    private void collectDtoIds(PostCommentDto dto, java.util.List<Long> ids) {
        ids.add(dto.getId());
        if (dto.getReplies() != null) {
            for (PostCommentDto reply : dto.getReplies()) {
                collectDtoIds(reply, ids);
            }
        }
    }

    private void updateDtoVotes(PostCommentDto dto, java.util.Map<Long, String> voteMap) {
        dto.setCurrentUserVoteStatus(voteMap.getOrDefault(dto.getId(), "NONE"));
        if (dto.getReplies() != null) {
            for (PostCommentDto reply : dto.getReplies()) {
                updateDtoVotes(reply, voteMap);
            }
        }
    }

    @Transactional(readOnly = true)
    public com.example.Qpoint.dto.PageDto<PostCommentDto> getUserComments(Long userId, int page, int size, Long currentUserId) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Comment> comments = commentRepository.findByAuthorOrderByCreatedAtDesc(author, pageable);
        
        return new com.example.Qpoint.dto.PageDto<>(convertToPostCommentDtoBulk(comments, currentUserId));
    }

    private Page<PostCommentDto> convertToPostCommentDtoBulk(Page<Comment> comments, Long currentUserId) {
        if (comments.isEmpty()) {
            return comments.map(c -> convertToPostCommentDto(c, "NONE"));
        }

        // If no user, just convert structure with NONE
        if (currentUserId == null) {
             return comments.map(c -> convertToPostCommentDtoWithVotes(c, java.util.Collections.emptyMap()));
        }

        java.util.List<Comment> commentList = comments.getContent();
        
        // Flatten comments to get all IDs including replies
        java.util.List<Comment> allComments = new java.util.ArrayList<>();
        for (Comment c : commentList) {
            collectCommentsRecursively(c, allComments);
        }
        
        java.util.List<Long> allCommentIds = allComments.stream().map(Comment::getId).toList();
        
        java.util.Map<Long, String> voteMap = java.util.Collections.emptyMap();
        
        if (!allCommentIds.isEmpty()) {
            User user = userRepository.getReferenceById(currentUserId);
            java.util.List<com.example.Qpoint.models.Vote> votes = voteRepository.findAllByUserAndEntityTypeAndEntityIdIn(
                    user, com.example.Qpoint.models.Vote.EntityType.COMMENT, allCommentIds);
            
            voteMap = votes.stream()
                    .collect(java.util.stream.Collectors.toMap(
                            com.example.Qpoint.models.Vote::getEntityId,
                            v -> v.getVoteType().name(),
                            (a, b) -> a));
        }

        final java.util.Map<Long, String> finalVoteMap = voteMap;
        return comments.map(c -> convertToPostCommentDtoWithVotes(c, finalVoteMap));
    }

    private void collectCommentsRecursively(Comment comment, java.util.List<Comment> accumulator) {
        accumulator.add(comment);
        if (comment.getReplies() != null) {
            for (Comment reply : comment.getReplies()) {
                collectCommentsRecursively(reply, accumulator);
            }
        }
    }

    private PostCommentDto convertToPostCommentDtoWithVotes(Comment comment, java.util.Map<Long, String> voteMap) {
         PostCommentDto dto = convertToPostCommentDto(comment, voteMap.getOrDefault(comment.getId(), "NONE"));
         
         // Re-map replies with vote context
         if (comment.getReplies() != null && !comment.getReplies().isEmpty()) {
             dto.setReplies(comment.getReplies().stream()
                     .map(reply -> convertToPostCommentDtoWithVotes(reply, voteMap))
                     .collect(java.util.stream.Collectors.toList()));
         }
         return dto;
    }

    public PostCommentDto convertToPostCommentDto(Comment comment, String voteStatus) {
        PostCommentDto dto = new PostCommentDto();
        dto.setId(comment.getId());
        dto.setPostId(comment.getPost().getId());
        dto.setContent(comment.getContent());
        dto.setUpvotes(comment.getUpvotes());
        dto.setDownvotes(comment.getDownvotes());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setIsAiGenerated(comment.getIsAiGenerated());
        
        if (comment.getParent() != null) {
            dto.setParentId(comment.getParent().getId());
        }

        PostCommentDto.AuthorDto authorDto = new PostCommentDto.AuthorDto();
        authorDto.setId(comment.getAuthor().getUserId());
        authorDto.setUserId(String.valueOf(comment.getAuthor().getUserId()));
        authorDto.setUsername(comment.getAuthor().getUsername());
        authorDto.setFullName(comment.getAuthor().getFullName());
        authorDto.setAvatarUrl(comment.getAuthor().getAvatarUrl());
        dto.setAuthor(authorDto);
        
        dto.setCurrentUserVoteStatus(voteStatus);

        // Note: Replies handling moved to wrapper/bulk method to support vote context propagation.
        // In simple conversion without bulk context, we default to NONE for replies unless handled by wrapper.
        // Maintain existing recursion for unexpected single calls:
        if (comment.getReplies() != null && !comment.getReplies().isEmpty()) {
             // For single conversion logic (legacy), we can't fetch votes efficiently.
             // We just map structure.
             dto.setReplies(comment.getReplies().stream()
                     .map(r -> convertToPostCommentDto(r, "NONE")) 
                     .collect(java.util.stream.Collectors.toList()));
        } else {
            dto.setReplies(new java.util.ArrayList<>());
        }

        return dto;
    }

    public PostCommentDto convertToPostCommentDto(Comment comment) {
        return convertToPostCommentDto(comment, "NONE");
    }

    /**
     * Creates an AI-generated comment for a post.
     */
    @Transactional
    public Comment createAiComment(Long postId, User aiUser, String content) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if AI comment already exists for this post
        if (commentRepository.existsByPostAndIsAiGeneratedTrue(post)) {
            throw new RuntimeException("AI answer already exists for this post");
        }

        Comment comment = Comment.builder()
                .post(post)
                .author(aiUser)
                .content(content)
                .isAiGenerated(true)
                .build();

        Comment savedComment = commentRepository.save(comment);

        // Increment comment count on post
        post.setCommentsCount(post.getCommentsCount() + 1);
        postRepository.save(post);

        return savedComment;
    }

    /**
     * Checks if an AI comment exists for the given post.
     */
    @Transactional(readOnly = true)
    public boolean hasAiComment(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return commentRepository.existsByPostAndIsAiGeneratedTrue(post);
    }

    /**
     * Deletes the AI-generated comment for a post, including all its nested replies.
     * Also updates the post's comment count.
     */
    @Transactional
    public void deleteAiComment(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        Comment aiComment = commentRepository.findByPostAndIsAiGeneratedTrue(post)
                .orElseThrow(() -> new RuntimeException("AI comment not found"));
        
        // Count total comments to delete (AI comment + all its replies)
        int totalCommentsToDelete = 1 + countRepliesRecursively(aiComment);
        
        // Update post comment count
        post.setCommentsCount(Math.max(0, post.getCommentsCount() - totalCommentsToDelete));
        postRepository.save(post);
        
        // Delete the AI comment (cascade will delete all replies due to orphanRemoval)
        commentRepository.delete(aiComment);
    }

    /**
     * Recursively counts all nested replies of a comment.
     */
    private int countRepliesRecursively(Comment comment) {
        if (comment.getReplies() == null || comment.getReplies().isEmpty()) {
            return 0;
        }
        int count = comment.getReplies().size();
        for (Comment reply : comment.getReplies()) {
            count += countRepliesRecursively(reply);
        }
        return count;
    }
}
