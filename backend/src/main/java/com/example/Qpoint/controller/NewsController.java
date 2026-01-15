package com.example.Qpoint.controller;

import com.example.Qpoint.dto.NewsDTO;
import com.example.Qpoint.models.Answer;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.AnswerRepository;
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
    private final AnswerRepository answerRepository;
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
        response.put("commentCount", discussionPost.getAnswerCount());
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
        
        // Create the answer/comment
        Answer comment = Answer.builder()
                .post(discussionPost)
                .author(user)
                .content(commentContent)
                .build();
        
        Answer savedComment = answerRepository.save(comment);
        
        // Update comment count
        discussionPost.setAnswerCount(discussionPost.getAnswerCount() + 1);
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
        List<Answer> answers = answerRepository.findByPostOrderByCreatedAtDesc(post);
        
        Long finalCurrentUserId = currentUserId;
        List<Map<String, Object>> comments = answers.stream().map(answer -> {
            Map<String, Object> comment = new HashMap<>();
            comment.put("id", answer.getId());
            comment.put("content", answer.getContent());
            comment.put("upvotes", answer.getUpvotes());
            comment.put("downvotes", answer.getDownvotes());
            comment.put("createdAt", answer.getCreatedAt().toString());
            comment.put("isAuthor", finalCurrentUserId != null && 
                    finalCurrentUserId.equals(answer.getAuthor().getUserId()));
            
            User author = answer.getAuthor();
            comment.put("author", Map.of(
                    "id", author.getUserId(),
                    "username", author.getUsername(),
                    "fullName", author.getFullName() != null ? author.getFullName() : author.getUsername(),
                    "avatarUrl", author.getAvatarUrl() != null ? author.getAvatarUrl() : ""
            ));
            
            return comment;
        }).toList();
        
        return ResponseEntity.ok(comments);
    }
}
