package com.example.Qpoint.service;

import com.example.Qpoint.dto.NewsDTO;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.PostType;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${newsapi.key:}")
    private String newsApiKey;

    private static final String NEWS_API_URL = "https://newsapi.org/v2/top-headlines";
    private static final int ARTICLES_PER_CATEGORY = 10;

    // Available categories from NewsAPI
    public static final List<String> CATEGORIES = List.of(
            "technology", "business", "science", "health", "sports", "entertainment"
    );

    /**
     * Fetch news articles, cached for 15 minutes.
     * Fetches 40 total articles across categories.
     */
    @Cacheable(value = "news", key = "'all-news'")
    public List<NewsDTO> getAllNews() {
        if (newsApiKey == null || newsApiKey.isBlank()) {
            log.warn("NewsAPI key not configured");
            return Collections.emptyList();
        }

        List<NewsDTO> allNews = new ArrayList<>();
        
        for (String category : CATEGORIES) {
            try {
                List<NewsDTO> categoryNews = fetchNewsByCategory(category);
                allNews.addAll(categoryNews);
            } catch (Exception e) {
                log.error("Failed to fetch news for category: {}", category, e);
            }
        }

        // Sort by publishedAt descending (newest first)
        allNews.sort((a, b) -> {
            if (a.getPublishedAt() == null) return 1;
            if (b.getPublishedAt() == null) return -1;
            return b.getPublishedAt().compareTo(a.getPublishedAt());
        });

        // Attach discussion info in bulk (single query)
        return attachDiscussionInfoBulk(allNews);
    }

    /**
     * Fetch news by specific category, cached.
     */
    @Cacheable(value = "news", key = "#category")
    public List<NewsDTO> getNewsByCategory(String category) {
        if (newsApiKey == null || newsApiKey.isBlank()) {
            log.warn("NewsAPI key not configured");
            return Collections.emptyList();
        }

        try {
            List<NewsDTO> news = fetchNewsByCategory(category);
            // Attach discussion info in bulk (single query)
            return attachDiscussionInfoBulk(news);
        } catch (Exception e) {
            log.error("Failed to fetch news for category: {}", category, e);
            return Collections.emptyList();
        }
    }

    /**
     * Fetch news from NewsAPI for a category.
     */
    @SuppressWarnings("unchecked")
    private List<NewsDTO> fetchNewsByCategory(String category) {
        String url = String.format("%s?category=%s&country=us&pageSize=%d&apiKey=%s",
                NEWS_API_URL, category, ARTICLES_PER_CATEGORY, newsApiKey);

        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();

        if (body == null || !"ok".equals(body.get("status"))) {
            log.error("NewsAPI returned error: {}", body);
            return Collections.emptyList();
        }

        List<Map<String, Object>> articles = (List<Map<String, Object>>) body.get("articles");
        if (articles == null) {
            return Collections.emptyList();
        }

        return articles.stream()
                .map(article -> mapToNewsDTO(article, category))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Map API response to NewsDTO.
     */
    @SuppressWarnings("unchecked")
    private NewsDTO mapToNewsDTO(Map<String, Object> article, String category) {
        try {
            String url = (String) article.get("url");
            if (url == null || url.isBlank()) {
                return null;
            }

            Map<String, Object> source = (Map<String, Object>) article.get("source");
            String sourceName = source != null ? (String) source.get("name") : "Unknown";
            String sourceId = source != null ? (String) source.get("id") : null;

            String publishedAtStr = (String) article.get("publishedAt");
            Instant publishedAt = publishedAtStr != null ? Instant.parse(publishedAtStr) : Instant.now();

            return NewsDTO.builder()
                    .id(generateArticleId(url))
                    .title((String) article.get("title"))
                    .description((String) article.get("description"))
                    .content((String) article.get("content"))
                    .author((String) article.get("author"))
                    .sourceName(sourceName)
                    .sourceId(sourceId)
                    .url(url)
                    .imageUrl((String) article.get("urlToImage"))
                    .publishedAt(publishedAt)
                    .category(category)
                    .build();
        } catch (Exception e) {
            log.error("Failed to map article to DTO", e);
            return null;
        }
    }

    /**
     * Attach discussion info (post ID, comment count) to news articles in BULK.
     * Uses a single query to fetch all existing discussion posts, avoiding N+1.
     */
    private List<NewsDTO> attachDiscussionInfoBulk(List<NewsDTO> newsList) {
        if (newsList.isEmpty()) {
            return newsList;
        }

        // 1. Collect all article URLs
        List<String> urls = newsList.stream()
                .map(NewsDTO::getUrl)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // 2. Fetch all existing posts in ONE query
        List<Post> existingPosts = postRepository.findAllByExternalUrlIn(urls);

        // 3. Build lookup map: externalUrl → Post
        Map<String, Post> urlToPost = existingPosts.stream()
                .filter(p -> p.getExternalUrl() != null)
                .collect(Collectors.toMap(Post::getExternalUrl, p -> p, (a, b) -> a));

        // 4. Attach info using map lookup (no DB queries)
        for (NewsDTO news : newsList) {
            Post discussionPost = urlToPost.get(news.getUrl());
            if (discussionPost != null) {
                news.setDiscussionPostId(discussionPost.getId());
                news.setCommentCount(discussionPost.getAnswerCount());
            } else {
                news.setCommentCount(0);
            }
        }

        return newsList;
    }

    /**
     * Generate unique article ID from URL.
     */
    public String generateArticleId(String url) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(url.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (int i = 0; i < 8; i++) { // Use first 8 bytes for shorter ID
                hexString.append(String.format("%02x", hash[i]));
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(url.hashCode());
        }
    }

    /**
     * Get or create a discussion post for a news article.
     */
    @Transactional
    public Post getOrCreateDiscussionPost(String articleUrl, String articleTitle, String articleImageUrl, Long userId) {
        // Check if discussion already exists
        Optional<Post> existing = postRepository.findByExternalUrl(articleUrl);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new discussion post
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post discussionPost = Post.builder()
                .type(PostType.NEWS_DISCUSSION)
                .title(articleTitle)
                .content("Discussion for news article")
                .imageUrl(articleImageUrl)
                .externalUrl(articleUrl)
                .author(user)
                .tags(List.of("news"))
                .build();

        return postRepository.save(discussionPost);
    }

    /**
     * Get AI context/summary for a news article.
     */
    public String getArticleContext(String title, String description, String content) {
        if (!geminiService.isConfigured()) {
            return "AI context is not available. Please configure the Gemini API key.";
        }

        String articleText = String.format("""
                Title: %s
                
                Description: %s
                
                Content: %s
                """, 
                title != null ? title : "",
                description != null ? description : "",
                content != null ? content : "");

        String prompt = String.format("""
                Analyze this news article and provide:
                1. A brief 2-3 sentence summary
                2. Key points (3-5 bullet points)
                3. Why this matters (context/implications)
                4. Related topics to explore
                
                Keep the response concise and informative.
                
                Article:
                %s
                """, articleText);

        try {
            return geminiService.callGeminiApi(null, prompt);
        } catch (Exception e) {
            log.error("Failed to get AI context for article", e);
            return "Unable to generate AI context at this time.";
        }
    }

    /**
     * Check if NewsAPI is configured.
     */
    public boolean isConfigured() {
        return newsApiKey != null && !newsApiKey.isBlank();
    }

    /**
     * Get available news categories.
     */
    public List<String> getCategories() {
        return CATEGORIES;
    }
}
