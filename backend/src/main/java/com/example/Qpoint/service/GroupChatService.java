package com.example.Qpoint.service;

import com.example.Qpoint.dto.GroupChatDTO;
import com.example.Qpoint.models.GroupMessage;
import com.example.Qpoint.models.GroupMessageDeletion;
import com.example.Qpoint.models.GroupMember;
import com.example.Qpoint.models.Post;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupChatService {

    private final GroupMessageRepository messageRepository;
    private final GroupMessageDeletionRepository deletionRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public GroupChatDTO.MessageResponse sendMessage(Long groupId, Long senderId, GroupChatDTO.SendMessageRequest request) {
        // Validate Membership (Active)
        if (!groupMemberRepository.isUserActiveMember(groupId, senderId)) {
            throw new RuntimeException("You are not an active member of this group");
        }

        User sender = userRepository.findById(senderId).orElseThrow();
        
        Post sharedPost = null;
        if (request.getSharedPostId() != null && request.getType() == GroupMessage.MessageType.POST_SHARE) {
            sharedPost = postRepository.findById(request.getSharedPostId())
                    .orElseThrow(() -> new RuntimeException("Shared post not found"));
        }
        
        GroupMessage message = GroupMessage.builder()
                .group(groupMemberRepository.findByGroupIdAndUserId(groupId, senderId).orElseThrow().getGroup())
                .sender(sender)
                .content(request.getContent())
                .type(request.getType())
                .sharedPost(sharedPost)
                .createdAt(LocalDateTime.now())
                .build();
        
        message = messageRepository.save(message);

        GroupChatDTO.MessageResponse response = mapToResponse(message, false);

        // Broadcast to /topic/group/{groupId}
        messagingTemplate.convertAndSend("/topic/group/" + groupId, response);
        
        return response;
    }

    /**
     * Async group message save — all DB work happens here in background.
     * Called after the instant broadcast from GroupWebSocketController.
     */
    @org.springframework.scheduling.annotation.Async
    @Transactional
    public void saveGroupMessageAsync(Long groupId, Long senderId, GroupChatDTO.SendMessageRequest request) {
        try {
            // Validate membership
            if (!groupMemberRepository.isUserActiveMember(groupId, senderId)) {
                log.warn("Non-member {} tried to send to group {}", senderId, groupId);
                return;
            }

            User sender = userRepository.findById(senderId).orElse(null);
            if (sender == null) {
                log.warn("Sender {} not found for group message", senderId);
                return;
            }

            Post sharedPost = null;
            if (request.getSharedPostId() != null && request.getType() == GroupMessage.MessageType.POST_SHARE) {
                sharedPost = postRepository.findById(request.getSharedPostId()).orElse(null);
            }

            GroupMessage message = GroupMessage.builder()
                    .group(groupMemberRepository.findByGroupIdAndUserId(groupId, senderId).orElseThrow().getGroup())
                    .sender(sender)
                    .content(request.getContent())
                    .type(request.getType() != null ? request.getType() : GroupMessage.MessageType.TEXT)
                    .sharedPost(sharedPost)
                    .createdAt(LocalDateTime.now())
                    .build();

            messageRepository.save(message);
        } catch (Exception e) {
            log.error("Failed to save group message async: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<GroupChatDTO.MessageResponse> getGroupMessages(Long groupId, Long userId, Pageable pageable) {
        // Validation: Must be member (active or used to be? Active required by spec "Clean Slate")
        // Actually the repository query handles the "joinedAt" check, so even if they are active now
        // it filters old messages. If they strictly "left", the repo check joinedAt handles clean slate on rejoin.
        
        List<Object[]> results = messageRepository.findVisibleMessages(groupId, userId, pageable);
        
        return results.stream().map(row -> {
            GroupMessage m = (GroupMessage) row[0];
            Boolean deletedForEveryone = (Boolean) row[1];
            
            // If deleted for everyone, mask content
            if (deletedForEveryone != null && deletedForEveryone) {
                // Return masked DTO
                return GroupChatDTO.MessageResponse.builder()
                        .id(m.getId())
                        .groupId(m.getGroup().getId())
                        .content("This message was deleted")
                        .type(GroupMessage.MessageType.TEXT)
                        .sender(GroupChatDTO.MessageResponse.SenderDto.builder()
                                .id(m.getSender().getUserId())
                                .username(m.getSender().getUsername())
                                .avatarUrl(m.getSender().getAvatarUrl())
                                .build())
                        .createdAt(m.getCreatedAt())
                        .deleted(true)
                        .build();
            }
            return mapToResponse(m, false);
        }).collect(Collectors.toList());
    }

    /**
     * Cursor-based paginated group messages.
     * Returns {messages: [...], hasMore: bool}
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getGroupMessagesPaginated(Long groupId, Long userId, Long before, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, size);

        List<Object[]> results;
        if (before != null) {
            results = messageRepository.findVisibleMessagesBeforeCursor(groupId, userId, before, pageable);
        } else {
            results = messageRepository.findVisibleMessagesPaginated(groupId, userId, pageable);
        }

        // Results are DESC from DB — reverse to ASC for display
        java.util.Collections.reverse(results);

        List<GroupChatDTO.MessageResponse> messages = results.stream().map(row -> {
            GroupMessage m = (GroupMessage) row[0];
            Boolean deletedForEveryone = (Boolean) row[1];

            if (deletedForEveryone != null && deletedForEveryone) {
                return GroupChatDTO.MessageResponse.builder()
                        .id(m.getId())
                        .groupId(m.getGroup().getId())
                        .content("This message was deleted")
                        .type(GroupMessage.MessageType.TEXT)
                        .sender(GroupChatDTO.MessageResponse.SenderDto.builder()
                                .id(m.getSender().getUserId())
                                .username(m.getSender().getUsername())
                                .avatarUrl(m.getSender().getAvatarUrl())
                                .build())
                        .createdAt(m.getCreatedAt())
                        .deleted(true)
                        .build();
            }
            return mapToResponse(m, false);
        }).collect(Collectors.toList());

        boolean hasMore = results.size() == size;

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("messages", messages);
        response.put("hasMore", hasMore);
        return response;
    }

    @Transactional
    public void deleteMessageForMe(Long messageId, Long userId) {
        if (!deletionRepository.existsByMessageIdAndUserIdAndDeletionType(messageId, userId, GroupMessageDeletion.DeletionType.FOR_ME)) {
            GroupMessage msg = messageRepository.findById(messageId).orElseThrow();
            User user = userRepository.findById(userId).orElseThrow();
            
            deletionRepository.save(GroupMessageDeletion.builder()
                    .message(msg)
                    .user(user)
                    .deletionType(GroupMessageDeletion.DeletionType.FOR_ME)
                    .deletedAt(LocalDateTime.now())
                    .build());
        }
    }

    @Transactional
    public void deleteMessageForEveryone(Long messageId, Long userId) {
        GroupMessage msg = messageRepository.findById(messageId).orElseThrow();
        Long groupId = msg.getGroup().getId();

        // Check Permissions
        // Admin: Can delete ANY
        // Member: Can delete OWN (Time limit 15m? Spec said "Admin no limit, Member own")
        
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Not a member"));
        
        boolean isAdmin = member.getRole() == GroupMember.Role.ADMIN;
        boolean isOwner = msg.getSender().getUserId().equals(userId);
        
        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Permission denied");
        }
        
        // Check for duplicates
        if (!deletionRepository.existsByMessageIdAndUserIdAndDeletionType(messageId, userId, GroupMessageDeletion.DeletionType.FOR_EVERYONE)) {
             // We mark it deleted by the deleter
             User repUser = userRepository.findById(userId).orElseThrow();
             
             deletionRepository.save(GroupMessageDeletion.builder()
                    .message(msg)
                    .user(repUser)
                    .deletionType(GroupMessageDeletion.DeletionType.FOR_EVERYONE)
                    .deletedAt(LocalDateTime.now())
                    .build());
             
             // Broadcast DELETED event
             // Define a simple event payload or reuse MessageResponse with masked content
             // It's better to send a specific event structure, but reusing MessageResponse with deleted=true works for simple clients
             messagingTemplate.convertAndSend("/topic/group/" + groupId + "/delete", 
                 new DeleteEvent(messageId, true)); // Custom payload or reusing DTO?
                 
             // Or send the updated Message DTO
             // For simplicity, let's assume client handles a specific "delete" event or updated message
             // Reusing MessageResponse to trigger update
             GroupChatDTO.MessageResponse update = GroupChatDTO.MessageResponse.builder()
                        .id(msg.getId())
                        .groupId(groupId)
                        .content("This message was deleted")
                        .type(GroupMessage.MessageType.TEXT)
                         .sender(GroupChatDTO.MessageResponse.SenderDto.builder()
                                .id(msg.getSender().getUserId())
                                .build())
                        .deleted(true)
                        .build();
             messagingTemplate.convertAndSend("/topic/group/" + groupId, update);
        }
    }

    private GroupChatDTO.MessageResponse mapToResponse(GroupMessage m, boolean deleted) {
        GroupChatDTO.MessageResponse.SharedPostDto sharedPostDto = null;
        if (m.getSharedPost() != null) {
            Post p = m.getSharedPost();
            sharedPostDto = GroupChatDTO.MessageResponse.SharedPostDto.builder()
                    .id(p.getId())
                    .title(p.getTitle())
                    .imageUrl(p.getImageUrl())
                    .authorName(p.getAuthor() != null ? p.getAuthor().getFullName() : null)
                    .build();
        }
        
        return GroupChatDTO.MessageResponse.builder()
                .id(m.getId())
                .groupId(m.getGroup().getId())
                .content(m.getContent())
                .type(m.getType())
                .sender(GroupChatDTO.MessageResponse.SenderDto.builder()
                        .id(m.getSender().getUserId())
                        .username(m.getSender().getUsername())
                        .avatarUrl(m.getSender().getAvatarUrl())
                        .build())
                .createdAt(m.getCreatedAt())
                .deleted(deleted)
                .sharedPost(sharedPostDto)
                .build();
    }
    
    // Quick helper class or simple map
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class DeleteEvent {
        private Long messageId;
        private boolean forEveryone;
    }
}
