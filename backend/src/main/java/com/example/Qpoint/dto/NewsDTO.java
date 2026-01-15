package com.example.Qpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsDTO {
    
    // Unique identifier (hash of URL)
    private String id;
    
    // Article content
    private String title;
    private String description;
    private String content;
    private String author;
    
    // Source info
    private String sourceName;
    private String sourceId;
    
    // URLs
    private String url;
    private String imageUrl;
    
    // Metadata
    private Instant publishedAt;
    private String category;
    
    // Discussion info (if exists)
    private Long discussionPostId;
    private Integer commentCount;
}
