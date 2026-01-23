package com.example.Qpoint.dto;

import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
public class UserProfileDto {
    private Long userId;
    private String email;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String location;
    private Instant joinedAt;
    private Integer reputation;
    private Integer followersCount;
    private Integer followingCount;
    private Integer questionsCount;
    private Integer answersCount;
    private List<String> skills;
    private Boolean verified;
    private Boolean allowPublicMessages;
    private Boolean isFollowing;
}