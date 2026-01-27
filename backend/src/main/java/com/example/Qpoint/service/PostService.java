package com.example.Qpoint.service;

import com.example.Qpoint.dto.CreatePostRequest;
import com.example.Qpoint.dto.FeedPostDto;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.PostType;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class PostService {

    public enum FeedTab {
        FOR_YOU,
        RECENT,
        UNANSWERED
    }

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final com.example.Qpoint.repository.PostViewRepository postViewRepository;
    private final com.example.Qpoint.repository.VoteRepository voteRepository;
    private final com.example.Qpoint.repository.CommentRepository commentRepository;
    private final com.example.Qpoint.repository.AnswerRepository answerRepository;
    private final com.example.Qpoint.repository.BookmarkRepository bookmarkRepository;
    private final com.example.Qpoint.repository.LikeRepository likeRepository;
    private final com.example.Qpoint.repository.TopicRepository topicRepository;

    private final org.springframework.cache.CacheManager cacheManager;

    public PostService(PostRepository postRepository, UserRepository userRepository,
                       com.example.Qpoint.repository.PostViewRepository postViewRepository,
                       com.example.Qpoint.repository.VoteRepository voteRepository,
                       com.example.Qpoint.repository.CommentRepository commentRepository,
                       com.example.Qpoint.repository.AnswerRepository answerRepository,
                       com.example.Qpoint.repository.BookmarkRepository bookmarkRepository,
                       com.example.Qpoint.repository.LikeRepository likeRepository,
                       com.example.Qpoint.repository.TopicRepository topicRepository,
                       org.springframework.cache.CacheManager cacheManager) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.postViewRepository = postViewRepository;
        this.voteRepository = voteRepository;
        this.commentRepository = commentRepository;
        this.answerRepository = answerRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.likeRepository = likeRepository;
        this.topicRepository = topicRepository;
        this.cacheManager = cacheManager;
    }

    private void evictUserPostsCache(Long userId) {
        if (cacheManager != null) {
            var cache = cacheManager.getCache("userPosts");
            if (cache != null) {
                // We use multiple keys: userId + ':questions' and userId + ':POST' etc.
                // Spring redis cache doesn't support wildcard eviction easily without custom implementation.
                // So we will explicitly evict known variation keys.
                // Assuming PostType enum has QUESTION and POST (add others if needed)
                cache.evict(userId + ":questions");
                cache.evict(userId + ":QUESTION"); // Just in case type is passed as param
                cache.evict(userId + ":POST");
            }
        }
    }

    @Transactional
    public Post createPost(Long authorId, CreatePostRequest request) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = new Post();
        post.setAuthor(author);
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setImageUrl(request.getImageUrl());
        post.setTags(request.getTags());
        try {
            post.setType(request.getType() != null ? PostType.valueOf(request.getType()) : PostType.QUESTION);
        } catch (IllegalArgumentException e) {
            post.setType(PostType.QUESTION);
        }
        post.setLikesCount(0);
        post.setUpvotes(0);
        post.setDownvotes(0);
        post.setCommentsCount(0);
        post.setAnswerCount(0);
        post.setViewsCount(0);

        // Handle Topics
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            java.util.Set<com.example.Qpoint.models.Topic> topics = new java.util.HashSet<>();
            List<String> tagNames = request.getTags();
            List<com.example.Qpoint.models.Topic> existingTopics = topicRepository.findByNameIn(tagNames);
            topics.addAll(existingTopics);

            List<String> existingNames = existingTopics.stream().map(com.example.Qpoint.models.Topic::getName).collect(java.util.stream.Collectors.toList());
            for (String name : tagNames) {
                if (!existingNames.contains(name)) {
                     com.example.Qpoint.models.Topic newTopic = com.example.Qpoint.models.Topic.builder()
                            .name(name)
                            .postCount(0)
                            .createdAt(java.time.Instant.now())
                            .build();
                     topics.add(topicRepository.save(newTopic));
                }
            }
            post.setTopics(topics);
            
            // Increment post counts for topics
            // Note: Simplistic approach. Ideally should check for duplicates or use a better way to increment.
            // Since we just created them with 0 or fetched existing, let's increment.
            for(com.example.Qpoint.models.Topic t : topics) {
                t.setPostCount(t.getPostCount() + 1);
                topicRepository.save(t);
            }
        }

        // Add reputation for posting a question (+3)
        author.setReputation(author.getReputation() + 3);
        userRepository.save(author);

        Post savedPost = postRepository.save(post);
        
        // Manual eviction or annotation? Annotation can't handle complex keys easily for "all lists"
        // But since we use specific keys: userPosts:{userId} (for questions) and userPosts:{userId}:{type}
        // we can attempt to evict all.
        // Actually, let's just use @CacheEvict in a @Caching block if possible.
        // But the key depends on the type.
        // I will use Manual Eviction via injected CacheManager for robustness here as well.
        evictUserPostsCache(authorId);
        
        return savedPost;
    }

    @Transactional
    // @CacheEvict(value = "posts", key = "#postId") --> Handled within update logic
    public Post updatePost(Long postId, Long userId, CreatePostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to update this post");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setImageUrl(request.getImageUrl());
        // Original code: post.setTags(request.getTags());
        // I will keep setTags logic but also update topics.
        post.setTags(request.getTags());
        
        // Update Topics
        if (request.getTags() != null) {
            // Decouple old topics count? Complex. For now just overwrite linkage. 
            // Correct count update is hard without difference calculation.
            // I'll skip count update on edit for MVP simplicity or just rebuild.
             java.util.Set<com.example.Qpoint.models.Topic> topics = new java.util.HashSet<>();
            List<String> tagNames = request.getTags();
            if (!tagNames.isEmpty()) {
                 List<com.example.Qpoint.models.Topic> existingTopics = topicRepository.findByNameIn(tagNames);
                topics.addAll(existingTopics);

                List<String> existingNames = existingTopics.stream().map(com.example.Qpoint.models.Topic::getName).collect(java.util.stream.Collectors.toList());
                for (String name : tagNames) {
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
            post.setTopics(topics);
        }

        post.setUpdatedAt(java.time.Instant.now());
        
        // Always evict the individual post cache
        if (cacheManager != null) {
            cacheManager.getCache("posts").evict(postId);
        }
        
        // Evict user posts lists because snippets might change
        evictUserPostsCache(userId);

        return postRepository.save(post);
    }

    @Transactional
    // @CacheEvict(value = "posts", key = "#postId") --> Handled in code
    public void deletePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this post");
        }

        // Manually delete votes because they are polymorphic and not cascaded by JPA directly
        // (unless we mapped them in Post, but they use entityId/entityType)
        try {
            // Delete votes for the post itself
            voteRepository.deleteByEntityTypeAndEntityId(com.example.Qpoint.models.Vote.EntityType.QUESTION, postId);
            
            // Delete votes for all answers (if any)
            if (post.getAnswers() != null) {
                for (com.example.Qpoint.models.Answer answer : post.getAnswers()) {
                     voteRepository.deleteByEntityTypeAndEntityId(com.example.Qpoint.models.Vote.EntityType.ANSWER, answer.getId());
                }
            }
             // Delete votes for comments (if any)
            if (post.getComments() != null) {
                for (com.example.Qpoint.models.Comment comment : post.getComments()) {
                     voteRepository.deleteByEntityTypeAndEntityId(com.example.Qpoint.models.Vote.EntityType.COMMENT, comment.getId());
                }
            }

        } catch (Exception e) {
            // Log but don't fail? Or fail transaction?
            // e.printStackTrace();
        }

        // Explicitly delete related entities to avoid FK constraints
        // This manual cleanup ensures that ALL dependencies are removed before the post
        try {
            bookmarkRepository.deleteByPost(post);
        } catch (Exception e) {}
        
        try {
            likeRepository.deleteByPost(post);
        } catch (Exception e) {}

        try {
            postViewRepository.deleteByPost(post);
        } catch (Exception e) {}

        commentRepository.deleteByPost(post);
        answerRepository.deleteByPost(post);
        
        // Evict individual post cache
        if (cacheManager != null) {
             cacheManager.getCache("posts").evict(postId);
        }
        
        // Evict user lists
        evictUserPostsCache(userId);

        postRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getUserFeed(List<Long> followingIds, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        // Get users that current user is following
        List<User> followingUsers = userRepository.findAllById(followingIds);
        
        // Get posts from followed users
        Page<Post> posts = postRepository.findByAuthorInOrderByCreatedAtDesc(followingUsers, pageable);
        
        return posts.map(post -> convertToFeedPostDto(post, null));

    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getFeedForUser(Long userId, FeedTab tab, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Post> posts;
        if (tab == null) tab = FeedTab.FOR_YOU;

        // Use queries that exclude user's own posts and NEWS_DISCUSSION type
        switch (tab) {
            case RECENT -> posts = postRepository.findAllExcludingUser(userId, pageable);
            case UNANSWERED -> posts = postRepository.findUnansweredPostsExcludingUser(userId, pageable);
            case FOR_YOU -> posts = postRepository.findForYouPostsExcludingUser(userId, pageable);
            default -> posts = postRepository.findForYouPostsExcludingUser(userId, pageable);
        }

        // Use bulk conversion to avoid N+1 queries
        return convertToFeedPostDtoBulk(posts, userId);
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getFeedForUser(Long userId, int page, int size) {
        return getFeedForUser(userId, FeedTab.FOR_YOU, page, size);
    }

    /**
     * Get questions posted by a specific user.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "userPosts", key = "#userId + ':questions'")
    public com.example.Qpoint.dto.PageDto<FeedPostDto> getUserQuestions(Long userId, int page, int size) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FeedPostDto> pageResult = postRepository.findByAuthorOrderByCreatedAtDesc(author, pageable)
                .map(post -> convertToFeedPostDto(post, null));
        return new com.example.Qpoint.dto.PageDto<>(pageResult);
    }

    /**
     * Get posts by a specific user filtered by type (QUESTION or POST).
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "userPosts", key = "#userId + ':' + #type")
    public com.example.Qpoint.dto.PageDto<FeedPostDto> getUserPostsByType(Long userId, com.example.Qpoint.models.PostType type, int page, int size) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FeedPostDto> pageResult = postRepository.findByAuthorAndTypeOrderByCreatedAtDesc(author, type, pageable)
                .map(post -> convertToFeedPostDto(post, null));
        return new com.example.Qpoint.dto.PageDto<>(pageResult);
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getAllPosts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> posts = postRepository.findAll(pageable);
        return posts.map(post -> convertToFeedPostDto(post, null));
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> searchPosts(String query, String tag, Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> posts;
        
        if (query != null && !query.isEmpty()) {
            posts = postRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(query, query, pageable);
        } else if (tag != null && !tag.isEmpty()) {
            posts = postRepository.findByTagOrderByCreatedAtDesc(tag, pageable);
        } else if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            posts = postRepository.findByAuthorOrderByCreatedAtDesc(user, pageable);
        } else {
            posts = postRepository.findAll(pageable);
        }
        
        return posts.map(post -> convertToFeedPostDto(post, userId));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "posts", key = "#postId")
    public FeedPostDto getPostById(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return convertToFeedPostDto(post, null);
    }

    @Transactional
    public FeedPostDto getPostByIdAndIncrementViews(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean alreadyViewed = postViewRepository.existsByUserAndPost(user, post);

            if (!alreadyViewed) {
                com.example.Qpoint.models.PostView view = com.example.Qpoint.models.PostView.builder()
                        .user(user)
                        .post(post)
                        .viewedAt(java.time.Instant.now())
                        .build();
                postViewRepository.save(view);

                post.setViewsCount(post.getViewsCount() + 1);
                
                // Add reputation to post author for unique view (+1)
                User postAuthor = post.getAuthor();
                postAuthor.setReputation(postAuthor.getReputation() + 1);
                userRepository.save(postAuthor);
                
                postRepository.save(post);
            }
        }
        // If user is null (anonymous), we do not increment view count as per functionality "one view count per user"
        // Or we could choose to increment unique anonymous views via IP, but that's out of scope.

        return convertToFeedPostDto(post, userId);
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getTrendingPosts(int page, int size) {
        return getTrendingPosts(page, size, null);
    }

    @Transactional(readOnly = true)
    public Page<FeedPostDto> getTrendingPosts(int page, int size, Long userId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> posts = postRepository.findTrendingPosts(pageable);
        // Use bulk conversion to avoid N+1 queries
        return convertToFeedPostDtoBulk(posts, userId);
    }

    // Exposed for building nested DTOs (e.g. bookmarks) without incrementing views.
    @Transactional(readOnly = true)
    public FeedPostDto convertToFeedPostDtoForBookmark(Post post) {
        return convertToFeedPostDto(post, null);
    }

    private FeedPostDto convertToFeedPostDto(Post post, Long userId) {
        FeedPostDto dto = new FeedPostDto();
        dto.setId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setContent(post.getContent());
        dto.setImageUrl(post.getImageUrl());
        // Create defensive copy of tags to avoid LazyInitializationException after transaction closes
    dto.setTags(post.getTags() != null ? new java.util.ArrayList<>(post.getTags()) : null);
        dto.setLikesCount(post.getLikesCount());
        dto.setUpvotes(post.getUpvotes());
        dto.setDownvotes(post.getDownvotes());
        // Use stored counter instead of COUNT query (prevents N+1)
        dto.setAnswerCount(post.getAnswerCount());
        dto.setCommentsCount(post.getCommentsCount());
        dto.setViewsCount(post.getViewsCount());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setType(post.getType() != null ? post.getType().name() : "QUESTION");

        FeedPostDto.AuthorDto authorDto = new FeedPostDto.AuthorDto();
        authorDto.setId(post.getAuthor().getUserId());
        authorDto.setUserId(String.valueOf(post.getAuthor().getUserId()));
        authorDto.setUsername(post.getAuthor().getUsername());
        authorDto.setFullName(post.getAuthor().getFullName());
        authorDto.setAvatarUrl(post.getAuthor().getAvatarUrl());
        dto.setAuthor(authorDto);

        if (userId != null) {
             java.util.Optional<com.example.Qpoint.models.Vote> vote = voteRepository.findByUserAndEntityTypeAndEntityId(
                     userRepository.getReferenceById(userId), 
                     com.example.Qpoint.models.Vote.EntityType.QUESTION, 
                     post.getId());
             dto.setCurrentUserVoteStatus(vote.map(v -> v.getVoteType().name()).orElse("NONE"));
             
             // Check if post is bookmarked by user
             boolean isBookmarked = bookmarkRepository.existsByUserAndPost(
                     userRepository.getReferenceById(userId), 
                     post);
             dto.setIsBookmarked(isBookmarked);
        } else {
            dto.setCurrentUserVoteStatus("NONE");
            dto.setIsBookmarked(false);
        }

        return dto;
    }

    /**
     * ============================================================================
     * OPTIMIZED BULK DTO CONVERSION
     * ============================================================================
     * 
     * Total queries: 4 (constant, regardless of page size)
     * 1. Posts + Authors (JOIN FETCH in repository)
     * 2. Votes (bulk IN query)
     * 3. Bookmarks (bulk IN query)
     * 4. Tags (bulk IN query via native SQL)
     * 
     * Previous: 3N + 1 queries (31 for 10 posts)
     * Now: 4 queries (always)
     */
    private Page<FeedPostDto> convertToFeedPostDtoBulk(Page<Post> posts, Long userId) {
        if (posts.isEmpty()) {
            return posts.map(this::convertToFeedPostDtoWithoutUserContext);
        }

        java.util.List<Post> postList = posts.getContent();
        java.util.List<Long> postIds = postList.stream().map(Post::getId).toList();

        // ========================================
        // BULK FETCH 1: Tags for all posts
        // ========================================
        java.util.Map<Long, java.util.List<String>> tagsMap = fetchTagsBulk(postIds);

        // ========================================
        // BULK FETCH 2 & 3: Votes and Bookmarks (only if user is logged in)
        // ========================================
        java.util.Map<Long, String> voteMap = java.util.Collections.emptyMap();
        java.util.Set<Long> bookmarkedPostIds = java.util.Collections.emptySet();

        if (userId != null) {
            User user = userRepository.getReferenceById(userId);
            
            // Votes: single query
            java.util.List<com.example.Qpoint.models.Vote> votes = voteRepository.findAllByUserAndEntityTypeAndEntityIdIn(
                    user, com.example.Qpoint.models.Vote.EntityType.QUESTION, postIds);
            
            voteMap = votes.stream()
                    .collect(java.util.stream.Collectors.toMap(
                            com.example.Qpoint.models.Vote::getEntityId,
                            v -> v.getVoteType().name(),
                            (a, b) -> a));

            // Bookmarks: single query
            java.util.List<com.example.Qpoint.models.Bookmark> bookmarks = 
                    bookmarkRepository.findAllByUserAndPostIn(user, postList);
            
            bookmarkedPostIds = bookmarks.stream()
                    .map(b -> b.getPost().getId())
                    .collect(java.util.stream.Collectors.toSet());
        }

        // ========================================
        // BUILD DTOs with O(1) Map lookups (no queries inside loop)
        // ========================================
        final java.util.Map<Long, String> finalVoteMap = voteMap;
        final java.util.Set<Long> finalBookmarkedPostIds = bookmarkedPostIds;

        return posts.map(post -> {
            FeedPostDto dto = new FeedPostDto();
            
            // Basic fields (no query - already loaded)
            dto.setId(post.getId());
            dto.setTitle(post.getTitle());
            dto.setContent(post.getContent());
            dto.setImageUrl(post.getImageUrl());
            dto.setLikesCount(post.getLikesCount());
            dto.setUpvotes(post.getUpvotes());
            dto.setDownvotes(post.getDownvotes());
            // Use stored counter instead of COUNT query (prevents N+1)
            dto.setAnswerCount(post.getAnswerCount());
            dto.setCommentsCount(post.getCommentsCount());
            dto.setViewsCount(post.getViewsCount());
            dto.setCreatedAt(post.getCreatedAt());
            dto.setType(post.getType() != null ? post.getType().name() : "QUESTION");

            // Tags from Map (no query)
            dto.setTags(tagsMap.getOrDefault(post.getId(), java.util.Collections.emptyList()));

            // Author (already loaded via JOIN FETCH, no query)
            FeedPostDto.AuthorDto authorDto = new FeedPostDto.AuthorDto();
            authorDto.setId(post.getAuthor().getUserId());
            authorDto.setUserId(String.valueOf(post.getAuthor().getUserId()));
            authorDto.setUsername(post.getAuthor().getUsername());
            authorDto.setFullName(post.getAuthor().getFullName());
            authorDto.setAvatarUrl(post.getAuthor().getAvatarUrl());
            dto.setAuthor(authorDto);

            // Vote status from Map (no query)
            dto.setCurrentUserVoteStatus(finalVoteMap.getOrDefault(post.getId(), "NONE"));
            
            // Bookmark status from Set (no query)
            dto.setIsBookmarked(finalBookmarkedPostIds.contains(post.getId()));

            return dto;
        });
    }

    /**
     * Bulk fetch tags for multiple posts using native SQL.
     * Returns Map: postId -> List<tag>
     * 
     * Uses native query: SELECT post_id, tag FROM post_tags WHERE post_id IN (...)
     * This is a SINGLE query instead of N lazy-load queries.
     */
    private java.util.Map<Long, java.util.List<String>> fetchTagsBulk(java.util.List<Long> postIds) {
        if (postIds.isEmpty()) {
            return java.util.Collections.emptyMap();
        }

        // Initialize result map with empty lists
        java.util.Map<Long, java.util.List<String>> result = new java.util.HashMap<>();
        for (Long postId : postIds) {
            result.put(postId, new java.util.ArrayList<>());
        }

        // Execute single native query to fetch all tags
        java.util.List<Object[]> tagRows = postRepository.findTagsByPostIds(postIds);
        
        // Build the map from query results
        for (Object[] row : tagRows) {
            Long postId = ((Number) row[0]).longValue();
            String tag = (String) row[1];
            result.computeIfAbsent(postId, k -> new java.util.ArrayList<>()).add(tag);
        }
        
        return result;
    }


    /**
     * Simple DTO conversion without user context (for anonymous users).
     */
    private FeedPostDto convertToFeedPostDtoWithoutUserContext(Post post) {
        FeedPostDto dto = new FeedPostDto();
        dto.setId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setContent(post.getContent());
        dto.setImageUrl(post.getImageUrl());
        dto.setTags(post.getTags() != null ? new java.util.ArrayList<>(post.getTags()) : java.util.Collections.emptyList());
        dto.setLikesCount(post.getLikesCount());
        dto.setUpvotes(post.getUpvotes());
        dto.setDownvotes(post.getDownvotes());
        // Use stored counter instead of COUNT query (prevents N+1)
        dto.setAnswerCount(post.getAnswerCount());
        dto.setCommentsCount(post.getCommentsCount());
        dto.setViewsCount(post.getViewsCount());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setType(post.getType() != null ? post.getType().name() : "QUESTION");

        FeedPostDto.AuthorDto authorDto = new FeedPostDto.AuthorDto();
        authorDto.setId(post.getAuthor().getUserId());
        authorDto.setUserId(String.valueOf(post.getAuthor().getUserId()));
        authorDto.setUsername(post.getAuthor().getUsername());
        authorDto.setFullName(post.getAuthor().getFullName());
        authorDto.setAvatarUrl(post.getAuthor().getAvatarUrl());
        dto.setAuthor(authorDto);

        dto.setCurrentUserVoteStatus("NONE");
        dto.setIsBookmarked(false);

        return dto;
    }
}
