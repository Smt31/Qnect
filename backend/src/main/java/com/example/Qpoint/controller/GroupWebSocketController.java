package com.example.Qpoint.controller;

import com.example.Qpoint.dto.GroupChatDTO;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.service.GroupChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class GroupWebSocketController {

    private final GroupChatService groupChatService;
    private final UserRepository userRepository;

    /**
     * Handle incoming group messages.
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
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        groupChatService.sendMessage(groupId, sender.getUserId(), request);
    }
}
