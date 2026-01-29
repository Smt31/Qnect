package com.example.Qpoint.dto;

import com.example.Qpoint.models.GroupMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class GroupChatDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {
        private String content;
        private GroupMessage.MessageType type; // TEXT, IMAGE
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageResponse {
        private Long id;
        private Long groupId;
        private String content;
        private SenderDto sender;
        private GroupMessage.MessageType type;
        private LocalDateTime createdAt;
        private boolean deleted; // For visual styling
        
        @Data
        @Builder
        public static class SenderDto {
            private Long id; // userId
            private String username;
            private String avatarUrl;
        }
    }
}
