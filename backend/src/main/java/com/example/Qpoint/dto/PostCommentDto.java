package com.example.Qpoint.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class PostCommentDto {
    private Long id;
    private Long postId;
    private AuthorDto author;
    private String content;
    private Integer upvotes;
    private Integer downvotes;
    private Instant createdAt;
    private Long parentId;
    private Boolean isAiGenerated;
    private java.util.List<PostCommentDto> replies;
    private String currentUserVoteStatus;

    @Data
    public static class AuthorDto {
        private Long id;
        private String userId;
        private String username;
        private String fullName;
        private String avatarUrl;
    }
}