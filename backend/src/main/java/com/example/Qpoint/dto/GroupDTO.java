package com.example.Qpoint.dto;

import com.example.Qpoint.models.GroupMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class GroupDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateGroupRequest {
        private String name;
        private String description;
        private String avatarUrl;
        private List<Long> memberIds; // Initial members (optional)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupResponse {
        private Long id;
        private String name;
        private String description;
        private String avatarUrl;
        private Long createdBy;
        private boolean isPrivate;
        private LocalDateTime createdAt;
        private List<MemberDto> members;
        private boolean isAdmin; // Helpful flag for frontend
        private boolean isMember;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberDto {
        private Long userId;
        private String username;
        private String fullName;
        private String avatarUrl;
        private GroupMember.Role role;
        private LocalDateTime joinedAt;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddMemberRequest {
        private List<Long> userIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateGroupRequest {
        private String name;
        private String description;
        private String avatarUrl;
    }
}
