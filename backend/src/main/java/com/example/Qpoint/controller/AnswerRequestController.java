package com.example.Qpoint.controller;

import com.example.Qpoint.dto.UserProfileDto;
import com.example.Qpoint.models.AnswerRequest;
import com.example.Qpoint.models.User;
import com.example.Qpoint.service.AnswerRequestService;
import com.example.Qpoint.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class AnswerRequestController {

    private final AnswerRequestService answerRequestService;
    private final UserService userService;

    public AnswerRequestController(AnswerRequestService answerRequestService, UserService userService) {
        this.answerRequestService = answerRequestService;
        this.userService = userService;
    }
    
    private UserProfileDto requireUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new RuntimeException("Unauthorized");
        }
        return userService.getUserProfileByUsername(userDetails.getUsername());
    }

    @PostMapping
    public ResponseEntity<?> createRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CreateRequestDto request) {
        
        UserProfileDto me = requireUser(userDetails);
        
        answerRequestService.createRequest(request.getQuestionId(), request.getExpertId(), me.getUserId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<UserProfileDto>> getSuggestions(
            @RequestParam Long questionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        UserProfileDto me = requireUser(userDetails);
        return ResponseEntity.ok(answerRequestService.getSuggestions(questionId, me.getUserId()));
    }
    
    @GetMapping("/already-requested")
    public ResponseEntity<List<Long>> getAlreadyRequestedUserIds(
            @RequestParam Long questionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        UserProfileDto me = requireUser(userDetails);
        return ResponseEntity.ok(answerRequestService.getAlreadyRequestedUserIds(questionId, me.getUserId()));
    }
    
    @GetMapping("/me/pending")
    public ResponseEntity<List<AnswerRequestDto>> getMyPendingRequests(
             @AuthenticationPrincipal UserDetails userDetails) {
        UserProfileDto me = requireUser(userDetails);
        List<AnswerRequest> requests = answerRequestService.getMyPendingRequests(me.getUserId());
        
        // Convert to DTO
        List<AnswerRequestDto> dtos = requests.stream().map(r -> {
            AnswerRequestDto dto = new AnswerRequestDto();
            dto.setId(r.getId());
            dto.setQuestionId(r.getQuestion().getId());
            dto.setQuestionTitle(r.getQuestion().getTitle());
            dto.setRequesterName(r.getRequestedBy().getFullName());
            dto.setRequesterAvatar(r.getRequestedBy().getAvatarUrl());
            dto.setCreatedAt(r.getCreatedAt());
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserProfileDto>> searchExperts(
            @RequestParam String query,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        UserProfileDto me = requireUser(userDetails);
        return ResponseEntity.ok(answerRequestService.searchExperts(query, me.getUserId()));
    }
    
    @lombok.Data
    @lombok.NoArgsConstructor
    public static class CreateRequestDto {
        private Long questionId;
        private Long expertId;
    }
    
    @lombok.Data
    @lombok.NoArgsConstructor
    public static class AnswerRequestDto {
        private Long id;
        private Long questionId;
        private String questionTitle;
        private String requesterName;
        private String requesterAvatar;
        private java.time.Instant createdAt;
    }
}
