package com.example.Qpoint.controller;

import com.example.Qpoint.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class RefineController {

    private final GeminiService geminiService;

    public RefineController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    /**
     * Refines a post title and description using AI.
     * This is a frontend-only feature - results are not saved to database.
     */
    @PostMapping("/refine")
    public ResponseEntity<?> refinePost(@RequestBody RefineRequest request) {
        if (!geminiService.isConfigured()) {
            return ResponseEntity.status(503)
                .body(Map.of("error", "AI service is not configured"));
        }

        try {
            GeminiService.RefineResult result = geminiService.refinePost(
                request.getTitle(),
                request.getDescription()
            );

            return ResponseEntity.ok(Map.of(
                "improvedTitle", result.getImprovedTitle() != null ? result.getImprovedTitle() : "",
                "improvedDescription", result.getImprovedDescription() != null ? result.getImprovedDescription() : "",
                "suggestedTopics", result.getSuggestedTopics() != null ? result.getSuggestedTopics() : List.of(),
                "changes", result.getChanges() != null ? result.getChanges() : List.of()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("error", "Failed to refine: " + e.getMessage()));
        }
    }

    public static class RefineRequest {
        private String title;
        private String description;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
}
