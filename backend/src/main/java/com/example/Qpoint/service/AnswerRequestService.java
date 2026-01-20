package com.example.Qpoint.service;

import com.example.Qpoint.models.*;
import com.example.Qpoint.repository.*;
import com.example.Qpoint.dto.UserProfileDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AnswerRequestService {

    private final AnswerRequestRepository answerRequestRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final UserService userService;

    public AnswerRequestService(AnswerRequestRepository answerRequestRepository,
                                PostRepository postRepository,
                                UserRepository userRepository,
                                NotificationService notificationService,
                                UserService userService) {
        this.answerRequestRepository = answerRequestRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @Transactional
    public void createRequest(Long questionId, Long expertId, Long requesterId) {
        Post question = postRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        if (!question.getAuthor().getUserId().equals(requesterId)) {
            throw new RuntimeException("Only the author can request answers");
        }

        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Requester not found"));

        if (expertId.equals(requesterId)) {
            throw new RuntimeException("Cannot request answer from yourself");
        }

        if (answerRequestRepository.existsByQuestionAndRequestedTo(question, expert)) {
            throw new RuntimeException("Request already sent to this user");
        }
        
        // Basic limits check (placeholder)
        // long count = answerRequestRepository.countByQuestionAndRequestedBy(question, requester);
        // if (count >= 5) throw new RuntimeException("Request limit reached for this question");

        AnswerRequest request = AnswerRequest.builder()
                .question(question)
                .requestedBy(requester)
                .requestedTo(expert)
                .status(AnswerRequest.RequestStatus.PENDING)
                .build();

        answerRequestRepository.save(request);        // Note: Reputation (+5) is awarded when the expert actually answers the question,\n        // not when they receive the request. See AnswerService.createAnswer()

        // Notify expert
        notificationService.createNotification(
                expertId,
                requesterId,
                Notification.NotificationType.ANSWER_REQUEST,
                questionId,
                requester.getFullName() + " asked you to answer: " + question.getTitle()
        );
    }

    @Transactional(readOnly = true)
    public List<UserProfileDto> getSuggestions(Long questionId, Long userId) {
        try {
            Post question = postRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found"));
            java.util.Set<com.example.Qpoint.models.Topic> questionTopics = question.getTopics();
            List<User> allUsers = userRepository.findAll();
            
            List<User> matchingExperts = new java.util.ArrayList<>();
            List<User> otherUsers = new java.util.ArrayList<>();

            for (User u : allUsers) {
                 // Skip current user and AI user "Cue"
                 if (u.getUserId().equals(userId)) continue;
                 if ("Cue".equalsIgnoreCase(u.getUsername()) || "Cue".equalsIgnoreCase(u.getFullName())) continue;

                 // Safe topic matching
                 boolean matches = false;
                 try {
                     if (questionTopics != null && !questionTopics.isEmpty()) {
                         matches = u.getTopics().stream().anyMatch(questionTopics::contains);
                     }
                 } catch (Exception e) {
                     // Ignore topic matching errors (lazy init etc)
                 }

                 if (matches) {
                     matchingExperts.add(u);
                 } else {
                     otherUsers.add(u);
                 }
            }

            java.util.Collections.shuffle(otherUsers);
            java.util.Collections.shuffle(matchingExperts);
            
            List<User> result = new java.util.ArrayList<>(matchingExperts);
            for (User u : otherUsers) {
                if (result.size() >= 4) break;
                result.add(u);
            }
            
            if (result.size() > 4) {
                result = result.subList(0, 4);
            }

            return result.stream()
                    .map(userService::convertToUserProfileDto)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace();
            // Emergency fallback: just get any 4 users (excluding Cue)
            return userRepository.findAll(org.springframework.data.domain.PageRequest.of(0, 10))
                    .getContent().stream()
                    .filter(u -> !u.getUserId().equals(userId))
                    .filter(u -> !"Cue".equalsIgnoreCase(u.getUsername()) && !"Cue".equalsIgnoreCase(u.getFullName()))
                    .limit(4)
                    .map(userService::convertToUserProfileDto)
                    .collect(Collectors.toList());
        }
    }
    
    @Transactional(readOnly = true)
    public List<AnswerRequest> getMyPendingRequests(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return answerRequestRepository.findByRequestedTo(user).stream()
                .filter(r -> r.getStatus() == AnswerRequest.RequestStatus.PENDING)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all user IDs that the current user has already sent requests to for a specific question.
     */
    @Transactional(readOnly = true)
    public List<Long> getAlreadyRequestedUserIds(Long questionId, Long requesterId) {
        Post question = postRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return answerRequestRepository.findByQuestionAndRequestedBy(question, requester)
                .stream()
                .map(req -> req.getRequestedTo().getUserId())
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<UserProfileDto> searchExperts(String query, Long userId) {
        try {
            // Search by username, full name, or topics
            List<User> users = userRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query);
            
            // If no users found by name/username, try searching by topics
            if (users.isEmpty()) {
                users = userRepository.findByTopicsNameContainingIgnoreCase(query);
            }
            
            // Filter out the current user
            users = users.stream()
                    .filter(u -> !u.getUserId().equals(userId))
                    .limit(10)
                    .collect(Collectors.toList());
            
            return users.stream()
                    .map(userService::convertToUserProfileDto)
                    .collect(Collectors.toList());
                    
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback: return users that match the query in any way
            return userRepository.findAll(org.springframework.data.domain.PageRequest.of(0, 10))
                    .getContent().stream()
                    .filter(u -> !u.getUserId().equals(userId))
                    .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()) || 
                                u.getFullName().toLowerCase().contains(query.toLowerCase()))
                    .map(userService::convertToUserProfileDto)
                    .collect(Collectors.toList());
        }
    }
}
