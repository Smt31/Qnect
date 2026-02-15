package com.example.Qpoint.dto;

import com.example.Qpoint.models.GroupMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberProjection {
    private Long userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private GroupMember.Role role;
    private LocalDateTime joinedAt;
    private Long groupId;
}
