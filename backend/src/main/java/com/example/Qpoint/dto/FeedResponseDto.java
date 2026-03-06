package com.example.Qpoint.dto;

import lombok.Data;
import java.util.List;

@Data
public class FeedResponseDto {
    private UserProfileDto user;
    private List<FeedPostDto> feed;
    private List<FeedPostDto> trending;
    private SuggestionsDto suggestions;
    private String nextCursor;
}