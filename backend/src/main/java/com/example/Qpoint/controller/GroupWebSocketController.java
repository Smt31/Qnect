package com.example.Qpoint.controller;

import com.example.Qpoint.dto.GroupChatDTO;
import com.example.Qpoint.models.GroupMessage;
import com.example.Qpoint.service.GroupChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
@Slf4j
public class GroupWebSocketController {

    private final GroupChatService groupChatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handle incoming group messages — ZERO DB QUERIES on broadcast path.
     * Destination: /app/group.chat/{groupId}
     */
    @MessageMapping("/group.chat/{groupId}")
    public void sendMessage(
            @DestinationVariable Long groupId,
            @Payload GroupChatDTO.SendMessageRequest request,
            Principal principal) {
        
        if (principal == null) {
            log.warn("Unauthenticated user attempted to send group message");
            return;
        }

        String username = principal.getName();

        try {
            // 1. Build immediate response from request fields only (NO DB!)
            GroupChatDTO.MessageResponse immediateResponse = GroupChatDTO.MessageResponse.builder()
                    .id(null)
                    .tempId(request.getTempId())
                    .groupId(groupId)
                    .content(request.getContent())
                    .sender(GroupChatDTO.MessageResponse.SenderDto.builder()
                            .id(request.getSenderId())
                            .username(username)
                            .avatarUrl(request.getSenderAvatar())
                            .build())
                    .type(request.getType() != null ? request.getType() : GroupMessage.MessageType.TEXT)
                    .createdAt(LocalDateTime.now())
                    .deleted(false)
                    .build();

            // 2. Broadcast Immediately to ALL group subscribers
            messagingTemplate.convertAndSend("/topic/group/" + groupId, immediateResponse);

            // 3. Trigger Async Save in background (all DB work happens here)
            groupChatService.saveGroupMessageAsync(groupId, request.getSenderId(), request);

        } catch (Exception e) {
            log.error("Error in group sendMessage: {}", e.getMessage());
            messagingTemplate.convertAndSendToUser(username, "/queue/errors", 
                    "Failed to send group message: " + e.getMessage());
        }
    }
}
