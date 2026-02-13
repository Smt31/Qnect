package com.example.Qpoint.controller;

import com.example.Qpoint.dto.ChatDTO;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.example.Qpoint.config.CustomUserDetails;
import java.security.Principal;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    private final org.springframework.messaging.simp.user.SimpUserRegistry simpUserRegistry;

    @GetMapping("/conversations")
    public ResponseEntity<List<ChatDTO.ConversationSummary>> getConversations(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(chatService.getConversations(user.getUserId()));
    }

    @GetMapping("/messages/{otherUserId}")
    public ResponseEntity<List<ChatDTO.MessageResponse>> getMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long otherUserId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(chatService.getMessageHistory(user.getUserId(), otherUserId));
    }

    @PostMapping("/send")
    public ResponseEntity<ChatDTO.MessageResponse> sendMessageHTTP(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatDTO.MessageRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 1. Build immediate response (NO DB queries)
        ChatDTO.MessageResponse immediateResponse = chatService.buildImmediateResponse(user, request);

        // 2. Broadcast Immediately to Receiver
        messagingTemplate.convertAndSendToUser(
                immediateResponse.getReceiverUsername(),
                "/queue/messages",
                immediateResponse
        );

        // 3. Trigger Async Save (validation + persistence happens here)
        chatService.saveMessageAsync(user.getUserId(), request);

        return ResponseEntity.ok(immediateResponse);
    }

    // WebSocket Handler — ZERO DB QUERIES on broadcast path
    @MessageMapping("/chat.send")
    public void sendMessageWS(@Payload ChatDTO.MessageRequest request, Principal principal) {
        if (principal == null) return;
        
        // Get username from JWT principal (already in memory, no DB)
        String username = principal.getName();
        
        try {
            // 1. Build immediate response using ONLY request fields (NO DB!)
            ChatDTO.MessageResponse immediateResponse = ChatDTO.MessageResponse.builder()
                    .id(null)
                    .tempId(request.getTempId())
                    .senderId(request.getSenderId())
                    .senderUsername(username)
                    .senderAvatar(request.getSenderAvatar())
                    .receiverId(request.getReceiverId())
                    .receiverUsername(request.getReceiverUsername())
                    .content(request.getContent())
                    .type(request.getType())
                    .attachmentUrl(request.getAttachmentUrl())
                    .createdAt(java.time.Instant.now())
                    .isRead(false)
                    .build();
            
            // 2. Broadcast Immediately to Receiver
            messagingTemplate.convertAndSendToUser(
                    request.getReceiverUsername(),
                    "/queue/messages",
                    immediateResponse
            );
            
            // 3. Ack to Sender
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/messages",
                    immediateResponse
            );
            
            // 4. Trigger Async Save in background (all DB work happens here)
            chatService.saveMessageAsync(request.getSenderId(), request);

        } catch (Exception e) {
            System.err.println("Error in sendMessageWS: " + e.getMessage());
            messagingTemplate.convertAndSendToUser(username, "/queue/errors", "Failed to send: " + e.getMessage());
        }
    }
    
    @PutMapping("/read/{otherUserId}")
    public ResponseEntity<Void> markAsRead(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long otherUserId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        chatService.markMessagesAsRead(user.getUserId(), otherUserId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/messages/{messageId}/delete-for-me")
    public ResponseEntity<Void> deleteMessageForMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long messageId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        chatService.deleteMessageForMe(user.getUserId(), messageId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/messages/{messageId}/delete-for-everyone")
    public ResponseEntity<Void> deleteMessageForEveryone(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long messageId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        chatService.deleteMessageForEveryone(user.getUserId(), messageId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/conversations/{otherUserId}/clear")
    public ResponseEntity<Void> clearConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long otherUserId) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        chatService.clearConversation(user.getUserId(), otherUserId);
        return ResponseEntity.ok().build();
    }
}
