package com.example.Qpoint.dto;

import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
public class FeedPostDto {
    private Long id;
    private AuthorDto author;
    private String title;
    private String content;
    private String imageUrl;
    private List<String> tags;
    private Integer likesCount;
    private Integer upvotes;
    private Integer downvotes;
    private Integer answerCount;
    private Integer commentsCount;
    private Integer viewsCount;
    private Instant createdAt;
    private String type;
    private String currentUserVoteStatus;
    private Boolean isBookmarked;
    
    @Data
    public static class AuthorDto {
        private Long id;
        private String fullName;
        private String avatarUrl;
    }
}