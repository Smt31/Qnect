package com.example.Qpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

public class ChatDTO {

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MessageRequest {
        private Long receiverId;
        private String content; // Text content
        private String type; // TEXT, IMAGE, POST_SHARE, QUESTION_SHARE
        private Long sharedPostId; // If sharing
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class MessageResponse {
        private Long id;
        private Long senderId;
        private String senderUsername;
        private String senderAvatar;
        private Long receiverId;
        private String content;
        private String type;
        private String attachmentUrl;
        private SharedPostDto sharedPost; // Full post details for rendering
        private Instant createdAt;
        private Boolean isRead;
    }
    
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class SharedPostDto {
        private Long id;
        private String title;
        private String imageUrl;
        private String content; // Truncated content preview
        private Long authorId;
        private String authorName;
        private String authorAvatar;
    }
    
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ConversationSummary {
        private Long conversationId;
        private Long otherUserId;
        private String otherUsername;
        private String otherUserAvatar;
        private String otherUserFullName;
        private String lastMessagePreview;
        private Instant lastMessageTime;
        private long unreadCount;
    }
}

