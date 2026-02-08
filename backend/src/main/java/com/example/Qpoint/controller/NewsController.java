package com.example.Qpoint.controller;

import com.example.Qpoint.dto.NewsDTO;
import com.example.Qpoint.models.Comment;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.CommentRepository;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    /**
     * Get all news articles (cached).
     */
    @GetMapping
    public ResponseEntity<List<NewsDTO>> getAllNews(
            @RequestParam(required = false) String category) {
        
        if (!newsService.isConfigured()) {
            return ResponseEntity.ok(List.of());
        }

        List<NewsDTO> news;
        if (category != null && !category.isBlank()) {
            news = newsService.getNewsByCategory(category.toLowerCase());
        } else {
            news = newsService.getAllNews();
        }
        
        return ResponseEntity.ok(news);
    }

    /**
     * Get available news categories.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(newsService.getCategories());
    }

    /**
     * Get AI context for a news article.
     */
    @PostMapping("/context")
    public ResponseEntity<Map<String, String>> getArticleContext(
            @RequestBody Map<String, String> request) {
        
        String title = request.get("title");
        String description = request.get("description");
        String content = request.get("content");
        
        String context = newsService.getArticleContext(title, description, content);
        
        Map<String, String> response = new HashMap<>();
        response.put("context", context);
        return ResponseEntity.ok(response);
    }

    /**
     * Get or create a discussion post for a news article.
     */
    @PostMapping("/discussion")
    public ResponseEntity<Map<String, Object>> getOrCreateDiscussion(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String articleUrl = request.get("url");
        String articleTitle = request.get("title");
        String articleImageUrl = request.get("imageUrl");
        
        if (articleUrl == null || articleUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Post discussionPost = newsService.getOrCreateDiscussionPost(
                articleUrl, articleTitle, articleImageUrl, user.getUserId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("postId", discussionPost.getId());
        response.put("commentCount", discussionPost.getCommentsCount());
        return ResponseEntity.ok(response);
    }

    /**
     * Add a comment to a news discussion.
     * Creates the discussion post if it doesn't exist.
     */
    @PostMapping("/comment")
    public ResponseEntity<Map<String, Object>> addComment(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String articleUrl = request.get("url");
        String articleTitle = request.get("title");
        String articleImageUrl = request.get("imageUrl");
        String commentContent = request.get("content");
        
        if (articleUrl == null || commentContent == null || commentContent.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get or create the discussion post
        Post discussionPost = newsService.getOrCreateDiscussionPost(
                articleUrl, articleTitle, articleImageUrl, user.getUserId());
        
        // Create the comment
        Comment comment = Comment.builder()
                .post(discussionPost)
                .author(user)
                .content(commentContent)
                .build();
        
        Comment savedComment = commentRepository.save(comment);
        
        // Update comment count
        discussionPost.setCommentsCount(discussionPost.getCommentsCount() + 1);
        postRepository.save(discussionPost);
        
        Map<String, Object> response = new HashMap<>();
        response.put("commentId", savedComment.getId());
        response.put("postId", discussionPost.getId());
        response.put("content", savedComment.getContent());
        response.put("author", Map.of(
                "id", user.getUserId(),
                "username", user.getUsername(),
                "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        ));
        response.put("createdAt", savedComment.getCreatedAt().toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get comments for a news article discussion.
     */
    @GetMapping("/comments")
    public ResponseEntity<List<Map<String, Object>>> getComments(
            @RequestParam String url,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        var discussionPost = postRepository.findByExternalUrl(url);
        
        if (discussionPost.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        Long currentUserId = null;
        if (userDetails != null) {
            User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
            if (user != null) {
                currentUserId = user.getUserId();
            }
        }
        
        Post post = discussionPost.get();
        List<Comment> comments = commentRepository.findByPostOrderByCreatedAtDesc(post);
        
        Long finalCurrentUserId = currentUserId;
        List<Map<String, Object>> commentList = comments.stream().map(comment -> {
            Map<String, Object> commentMap = new HashMap<>();
            commentMap.put("id", comment.getId());
            commentMap.put("content", comment.getContent());
            commentMap.put("upvotes", comment.getUpvotes());
            commentMap.put("downvotes", comment.getDownvotes());
            commentMap.put("createdAt", comment.getCreatedAt().toString());
            commentMap.put("isAuthor", finalCurrentUserId != null && 
                    finalCurrentUserId.equals(comment.getAuthor().getUserId()));
            
            User author = comment.getAuthor();
            commentMap.put("author", Map.of(
                    "id", author.getUserId(),
                    "username", author.getUsername(),
                    "fullName", author.getFullName() != null ? author.getFullName() : author.getUsername(),
                    "avatarUrl", author.getAvatarUrl() != null ? author.getAvatarUrl() : ""
            ));
            
            return commentMap;
        }).toList();
        
        return ResponseEntity.ok(commentList);
    }
}
