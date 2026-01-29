package com.example.Qpoint.service;

import com.example.Qpoint.dto.GroupChatDTO;
import com.example.Qpoint.models.GroupMessage;
import com.example.Qpoint.models.GroupMessageDeletion;
import com.example.Qpoint.models.GroupMember;
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
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public GroupChatDTO.MessageResponse sendMessage(Long groupId, Long senderId, GroupChatDTO.SendMessageRequest request) {
        // Validate Membership (Active)
        if (!groupMemberRepository.isUserActiveMember(groupId, senderId)) {
            throw new RuntimeException("You are not an active member of this group");
        }

        User sender = userRepository.findById(senderId).orElseThrow();
        
        GroupMessage message = GroupMessage.builder()
                .group(groupMemberRepository.findById(groupId).orElseThrow().getGroup()) // Slight optimization possible
                .sender(sender)
                .content(request.getContent())
                .type(request.getType())
                .createdAt(LocalDateTime.now())
                .build();
        
        message = messageRepository.save(message);

        GroupChatDTO.MessageResponse response = mapToResponse(message, false);

        // Broadcast to /topic/group/{groupId}
        messagingTemplate.convertAndSend("/topic/group/" + groupId, response);
        
        return response;
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
