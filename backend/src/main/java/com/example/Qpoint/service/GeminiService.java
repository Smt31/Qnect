package com.example.Qpoint.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model.primary:gemini-2.5-flash}")
    private String primaryModel;

    @Value("${gemini.model.fallback:gemini-2.5-flash-lite}")
    private String fallbackModel;

    private final RestTemplate restTemplate;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Generates an AI answer for a given question using Gemini API.
     * Tries the primary model first, falls back to secondary model if it fails.
     * @param questionTitle The title of the question
     * @param questionContent The content/body of the question
     * @return The AI-generated answer text
     */
    public String generateAnswer(String questionTitle, String questionContent) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.");
        }

        String prompt = buildPrompt(questionTitle, questionContent);

        // Try primary model first
        try {
            return callGeminiApi(primaryModel, prompt);
        } catch (Exception primaryError) {
            // Log the primary failure and try fallback
            System.out.println("Primary model (" + primaryModel + ") failed: " + primaryError.getMessage());
            System.out.println("Trying fallback model: " + fallbackModel);
            
            try {
                return callGeminiApi(fallbackModel, prompt);
            } catch (Exception fallbackError) {
                // Both models failed
                throw new RuntimeException("Both AI models failed. Primary (" + primaryModel + "): " + 
                    primaryError.getMessage() + ", Fallback (" + fallbackModel + "): " + fallbackError.getMessage());
            }
        }
    }

    /**
     * Calls the Gemini API with a specific model.
     * If model is null, uses primary model with fallback.
     */
    public String callGeminiApi(String model, String prompt) {
        if (model == null) {
            // Try primary model first, fallback if needed
            try {
                return callGeminiApiInternal(primaryModel, prompt);
            } catch (Exception e) {
                return callGeminiApiInternal(fallbackModel, prompt);
            }
        }
        return callGeminiApiInternal(model, prompt);
    }

    private String callGeminiApiInternal(String model, String prompt) {
        String url = String.format(
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
            model, apiKey
        );

        // Build request body
        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> content = new HashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        parts.add(part);
        content.put("parts", parts);
        contents.add(content);
        requestBody.put("contents", contents);

        // Add generation config
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 1024);
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return extractTextFromResponse(response.getBody());
        } else {
            throw new RuntimeException("API returned status: " + response.getStatusCode());
        }
    }

    private String buildPrompt(String title, String content) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are Cue, a helpful AI assistant answering questions on a Q&A platform called Qpoint. ");
        sb.append("Please provide a clear, informative, and helpful answer to the following question.\n\n");
        sb.append("Question Title: ").append(title).append("\n");
        if (content != null && !content.isBlank()) {
            sb.append("Question Details: ").append(content).append("\n");
        }
        sb.append("\nProvide a comprehensive but concise answer. Format your response with proper paragraphs.");
        sb.append(" If relevant, use bullet points or numbered lists for clarity.");
        sb.append(" Do not include any greetings or sign-offs, just the answer content.");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromResponse(Map<String, Object> responseBody) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> candidate = candidates.get(0);
                Map<String, Object> contentMap = (Map<String, Object>) candidate.get("content");
                if (contentMap != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            throw new RuntimeException("Could not extract text from Gemini response");
        } catch (ClassCastException e) {
            throw new RuntimeException("Invalid response format from Gemini API", e);
        }
    }

    /**
     * Refines a post title and description using AI.
     * Returns improved versions and a list of changes made.
     */
    public RefineResult refinePost(String title, String description) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is not configured.");
        }

        String prompt = buildRefinePrompt(title, description);

        String response;
        try {
            response = callGeminiApi(primaryModel, prompt);
        } catch (Exception e) {
            try {
                response = callGeminiApi(fallbackModel, prompt);
            } catch (Exception e2) {
                throw new RuntimeException("AI refinement failed: " + e2.getMessage());
            }
        }

        return parseRefineResponse(response, title, description);
    }

    private String buildRefinePrompt(String title, String description) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are Cue, a writing assistant on Qpoint, a Q&A platform. ");
        sb.append("Help the user polish their question/post to be clearer and more engaging.\n\n");
        sb.append("Current Title: ").append(title != null ? title : "(empty)").append("\n");
        sb.append("Current Description: ").append(description != null && !description.isBlank() ? description : "(empty)").append("\n\n");
        sb.append("Respond in EXACTLY this format (use these exact labels):\n");
        sb.append("IMPROVED_TITLE: [your improved title here]\n");
        sb.append("IMPROVED_DESCRIPTION: [your improved description here]\n");
        sb.append("CHANGES:\n");
        sb.append("- [change 1]\n");
        sb.append("- [change 2]\n");
        sb.append("- [change 3]\n\n");
        sb.append("Guidelines:\n");
        sb.append("- Keep improvements subtle and helpful, not drastic rewrites\n");
        sb.append("- Preserve the user's intent and voice\n");
        sb.append("- Fix grammar, clarity, and make it more engaging\n");
        sb.append("- If title is already good, keep it similar\n");
        sb.append("- List 2-4 brief changes you made\n");
        return sb.toString();
    }

    private RefineResult parseRefineResponse(String response, String originalTitle, String originalDescription) {
        RefineResult result = new RefineResult();
        
        // Parse improved title
        int titleStart = response.indexOf("IMPROVED_TITLE:");
        int descStart = response.indexOf("IMPROVED_DESCRIPTION:");
        int changesStart = response.indexOf("CHANGES:");
        
        if (titleStart != -1 && descStart != -1) {
            String improvedTitle = response.substring(titleStart + 15, descStart).trim();
            result.setImprovedTitle(improvedTitle);
        } else {
            result.setImprovedTitle(originalTitle);
        }
        
        if (descStart != -1 && changesStart != -1) {
            String improvedDesc = response.substring(descStart + 21, changesStart).trim();
            result.setImprovedDescription(improvedDesc);
        } else if (descStart != -1) {
            String improvedDesc = response.substring(descStart + 21).trim();
            result.setImprovedDescription(improvedDesc);
        } else {
            result.setImprovedDescription(originalDescription);
        }
        
        // Parse changes
        List<String> changes = new ArrayList<>();
        if (changesStart != -1) {
            String changesSection = response.substring(changesStart + 8).trim();
            String[] lines = changesSection.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (line.startsWith("-") || line.startsWith("•")) {
                    changes.add(line.substring(1).trim());
                } else if (!line.isEmpty() && changes.size() < 5) {
                    changes.add(line);
                }
            }
        }
        if (changes.isEmpty()) {
            changes.add("Improved clarity and readability");
        }
        result.setChanges(changes);
        
        return result;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Result class for post refinement.
     */
    public static class RefineResult {
        private String improvedTitle;
        private String improvedDescription;
        private List<String> changes;

        public String getImprovedTitle() { return improvedTitle; }
        public void setImprovedTitle(String improvedTitle) { this.improvedTitle = improvedTitle; }
        public String getImprovedDescription() { return improvedDescription; }
        public void setImprovedDescription(String improvedDescription) { this.improvedDescription = improvedDescription; }
        public List<String> getChanges() { return changes; }
        public void setChanges(List<String> changes) { this.changes = changes; }
    }
}
