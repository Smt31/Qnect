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

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository, UserRepository userRepository, NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
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

        return savedComment; // Kept original return type as Comment, not PostCommentDto
    }

    @Transactional
    public Comment updateComment(Long commentId, Long userId, CreateCommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to update this comment");
        }

        comment.setContent(request.getContent());
        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getUserId().equals(userId) && !comment.getPost().getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }

        // Decrement comment count on post
        Post post = comment.getPost();
        post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
        postRepository.save(post);

        commentRepository.delete(comment);
    }

    @Transactional(readOnly = true)
    public Page<PostCommentDto> getCommentsForPost(Long postId, int page, int size) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        // Only return top-level comments
        return commentRepository.findByPostAndParentIsNullOrderByCreatedAtDesc(post, pageable)
                .map(this::convertToPostCommentDto);
    }

    @Transactional(readOnly = true)
    public Page<PostCommentDto> getUserComments(Long userId, int page, int size) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentRepository.findByAuthorOrderByCreatedAtDesc(author, pageable)
                .map(this::convertToPostCommentDto);
    }

    public PostCommentDto convertToPostCommentDto(Comment comment) {
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

        // Map replies recursively (limit depth if needed, but for now simple recursion)
        if (comment.getReplies() != null && !comment.getReplies().isEmpty()) {
            dto.setReplies(comment.getReplies().stream()
                    .map(this::convertToPostCommentDto)
                    .collect(java.util.stream.Collectors.toList()));
        } else {
            dto.setReplies(new java.util.ArrayList<>());
        }

        return dto;
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
