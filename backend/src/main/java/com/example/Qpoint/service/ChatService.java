package com.example.Qpoint.service;

import com.example.Qpoint.dto.ChatDTO;
import com.example.Qpoint.models.*;
import com.example.Qpoint.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final FollowRepository followRepository;
    private final AnswerRequestRepository answerRequestRepository;
    private final PostRepository postRepository;
    private final MessageDeletionRepository messageDeletionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final CacheManager cacheManager; // Inject CacheManager for manual eviction

    @Transactional(readOnly = true)
    @Cacheable(value = "conversations", key = "#currentUserId")
    public List<ChatDTO.ConversationSummary> getConversations(Long currentUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 1. Get existing conversations from DB
        List<Conversation> existingConversations = conversationRepository.findByUserId(currentUserId);
        
        Set<Long> usersInConversation = new HashSet<>();
        List<ChatDTO.ConversationSummary> summaries = new ArrayList<>();

        for (Conversation conv : existingConversations) {
            User otherUser = conv.getUser1().getUserId().equals(currentUserId) ? conv.getUser2() : conv.getUser1();
            usersInConversation.add(otherUser.getUserId());
            
            long unreadCount = messageRepository.countByConversationIdAndReceiverUserIdAndIsReadFalse(conv.getId(), currentUserId);
            
            summaries.add(new ChatDTO.ConversationSummary(
                    conv.getId(),
                    otherUser.getUserId(),
                    otherUser.getUsername(),
                    otherUser.getAvatarUrl(),
                    otherUser.getFullName(),
                    conv.getLastMessage() != null ? conv.getLastMessage().getContent() : "",
                    conv.getUpdatedAt(),
                    unreadCount
            ));
        }

        // 2. Compute "Eligible Users" who are NOT yet in a conversation
        
        Set<User> eligibleUsers = new HashSet<>();
        
        // 2.1 Mutual Follows
        List<Follow> following = followRepository.findByFollower(currentUser);
        for (Follow f : following) {
            User target = f.getFollowing();
            if (followRepository.existsByFollowerAndFollowing(target, currentUser)) {
                eligibleUsers.add(target);
            }
        }
        
        System.out.println("DEBUG: Found " + eligibleUsers.size() + " eligible users from mutual follows for user " + currentUser.getUsername());

        // 2.2 Answer Requests (Sent by me OR Received by me)
        List<AnswerRequest> requestsSent = answerRequestRepository.findByRequestedBy(currentUser);
        for(AnswerRequest req : requestsSent) eligibleUsers.add(req.getRequestedTo());
        
        List<AnswerRequest> requestsReceived = answerRequestRepository.findByRequestedTo(currentUser);
        for(AnswerRequest req : requestsReceived) eligibleUsers.add(req.getRequestedBy());

        // 2.3 Answered Questions
        // Logic intentionally similar to original

        for (User potential : eligibleUsers) {
            if (!usersInConversation.contains(potential.getUserId())) {
                summaries.add(new ChatDTO.ConversationSummary(
                        null, // No conversation ID yet
                        potential.getUserId(),
                        potential.getUsername(),
                        potential.getAvatarUrl(),
                        potential.getFullName(),
                        "Start a conversation",
                        null,
                        0
                ));
            }
        }
        
        // 2.4 Add users who allow public messages
        List<User> publicMessageUsers = userRepository.findByAllowPublicMessagesTrue();
        for (User potential : publicMessageUsers) {
            if (!usersInConversation.contains(potential.getUserId()) && 
                !potential.getUserId().equals(currentUserId) && // Don't include self
                !eligibleUsers.contains(potential)) { // Don't duplicate
                summaries.add(new ChatDTO.ConversationSummary(
                        null, // No conversation ID yet
                        potential.getUserId(),
                        potential.getUsername(),
                        potential.getAvatarUrl(),
                        potential.getFullName(),
                        "Public message allowed",
                        null,
                        0
                ));
            }
        }
        
        // Sort by time (most recent first), nulls last
        summaries.sort((a, b) -> {
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        return summaries;
    }

    /**
     * FAST PATH: Build an immediate response for broadcast using ONLY in-memory data.
     * No database queries here — all validation happens in saveMessageAsync.
     * This makes the broadcast to receiver near-instant.
     */
    public ChatDTO.MessageResponse buildImmediateResponse(User sender, ChatDTO.MessageRequest request) {
        // Fast path: use receiverUsername from frontend if available
        String receiverUsername = request.getReceiverUsername();
        if (receiverUsername == null || receiverUsername.isEmpty()) {
            // Fallback: lookup from DB (only for ShareModal or legacy callers)
            User receiver = userRepository.findById(request.getReceiverId()).orElse(null);
            receiverUsername = receiver != null ? receiver.getUsername() : null;
        }

        return ChatDTO.MessageResponse.builder()
                .id(null)
                .tempId(request.getTempId())
                .senderId(sender.getUserId())
                .senderUsername(sender.getUsername())
                .senderAvatar(sender.getAvatarUrl())
                .receiverId(request.getReceiverId())

                .receiverUsername(receiverUsername)
                .content(request.getContent())
                .type(request.getType())
                .attachmentUrl(request.getAttachmentUrl())
                .createdAt(Instant.now())
                .isRead(false)
                .build();
    }

    @org.springframework.scheduling.annotation.Async
    @Transactional
    public void saveMessageAsync(Long senderId, ChatDTO.MessageRequest request) {
        try {
            User sender = userRepository.findById(senderId)
                    .orElseThrow(() -> new RuntimeException("Sender not found"));
            User receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new RuntimeException("Receiver not found"));

            Conversation conversation = conversationRepository.findConversationByUsers(senderId, request.getReceiverId())
                    .orElseGet(() -> {
                        Conversation newConv = Conversation.builder()
                                .user1(senderId < request.getReceiverId() ? sender : receiver)
                                .user2(senderId < request.getReceiverId() ? receiver : sender)
                                .updatedAt(Instant.now())
                                .build();
                        return conversationRepository.save(newConv);
                    });

            Message message = Message.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .content(request.getContent())
                    .type(Message.MessageType.valueOf(request.getType()))
                    .attachmentUrl(request.getAttachmentUrl())
                    .conversation(conversation)
                    .createdAt(Instant.now())
                    .isRead(false)
                    .build();
            
            if (request.getSharedPostId() != null) {
                Post sharedPost = postRepository.findById(request.getSharedPostId())
                        .orElse(null);
                if (sharedPost != null) {
                    message.setSharedPost(sharedPost);
                    if (request.getContent() == null || request.getContent().isEmpty()) {
                        message.setContent("Shared a post");
                    }
                }
            }

            Message savedMessage = messageRepository.save(message);

            conversation.setLastMessage(savedMessage);
            conversation.setUpdatedAt(Instant.now());
            conversationRepository.save(conversation);

            // Manually evict cache
            evictConversationCache(senderId);
            evictConversationCache(receiver.getUserId());
            evictMessagesCache(senderId, receiver.getUserId());

            // Broadcast CONFIRMATION (Saved Event) to BOTH users
            ChatDTO.MessageResponse confirmation = ChatDTO.MessageResponse.builder()
                    .id(savedMessage.getId())
                    .tempId(request.getTempId())
                    .senderId(sender.getUserId())
                    .senderUsername(sender.getUsername())
                    .senderAvatar(sender.getAvatarUrl())
                    .receiverId(receiver.getUserId())
                    .content(savedMessage.getContent())
                    .type(savedMessage.getType().name())
                    .attachmentUrl(savedMessage.getAttachmentUrl())
                    .sharedPost(buildSharedPostDto(message.getSharedPost()))
                    .createdAt(savedMessage.getCreatedAt())
                    .isRead(false)
                    .build();

            // Notify Receiver (Update their view with real ID)
            messagingTemplate.convertAndSendToUser(
                    receiver.getUsername(),
                    "/queue/messages",
                    confirmation
            );
            
            // Notify Sender (Update their view with real ID)
            messagingTemplate.convertAndSendToUser(
                    sender.getUsername(),
                    "/queue/messages",
                    confirmation
            );

        } catch (Exception e) {
            e.printStackTrace();
            // Notify Sender of FAILURE
             messagingTemplate.convertAndSendToUser(
                userRepository.findById(senderId).get().getUsername(),
                "/queue/errors",
                "Message failed to send: " + e.getMessage()
            );
        }
    }

    @Transactional
    public ChatDTO.MessageResponse sendMessage(User sender, ChatDTO.MessageRequest request) {
        return buildImmediateResponse(sender, request);
    }
    
    private ChatDTO.SharedPostDto buildSharedPostDto(Post post) {
        if (post == null) return null;
        
        String contentPreview = null;
        if (post.getContent() != null && post.getContent().length() > 100) {
            contentPreview = post.getContent().substring(0, 100) + "...";
        } else {
            contentPreview = post.getContent();
        }
        
        return ChatDTO.SharedPostDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .imageUrl(post.getImageUrl())
                .content(contentPreview)
                .authorId(post.getAuthor().getUserId())
                .authorName(post.getAuthor().getFullName())
                .authorAvatar(post.getAuthor().getAvatarUrl())
                .build();
    }

    @Transactional(readOnly = true)
@Cacheable(value = "messages", key = "T(java.lang.Math).min(#currentUserId, #otherUserId) + ':' + T(java.lang.Math).max(#currentUserId, #otherUserId)")
public List<ChatDTO.MessageResponse> getMessageHistory(Long currentUserId, Long otherUserId) {
    Optional<Conversation> conv = conversationRepository.findConversationByUsers(currentUserId, otherUserId);
    if (conv.isEmpty()) return Collections.emptyList();

    // Use filtered query to handle deletions properly
    List<Object[]> results = messageRepository.findMessagesWithVisibility(conv.get().getId(), currentUserId);
    
    return results.stream().map(row -> {
        Message m = (Message) row[0];
        boolean deletedForEveryone = (Boolean) row[1];
        
        String content = m.getContent();
        String type = m.getType().name();
        String attachmentUrl = m.getAttachmentUrl();
        ChatDTO.SharedPostDto sharedPost = buildSharedPostDto(m.getSharedPost());
        
        // If deleted for everyone, mask the content
        if (deletedForEveryone) {
            content = "This message was deleted";
            type = "TEXT";
            attachmentUrl = null;
            sharedPost = null;
        }

        return ChatDTO.MessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender().getUserId())
                .senderUsername(m.getSender().getUsername())
                .senderAvatar(m.getSender().getAvatarUrl())
                .receiverId(m.getReceiver().getUserId())
                .content(content)
                .type(type)
                .attachmentUrl(attachmentUrl)
                .sharedPost(sharedPost)
                .createdAt(m.getCreatedAt())
                .isRead(m.getIsRead())
                .deleted(deletedForEveryone)
                .build();
    }).collect(Collectors.toList());
}    
    @Transactional
    public void markMessagesAsRead(Long currentUserId, Long otherUserId) {
         Optional<Conversation> conv = conversationRepository.findConversationByUsers(currentUserId, otherUserId);
         if (conv.isPresent()) {
             List<Message> unreadMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.get().getId()).stream()
                     .filter(m -> m.getReceiver().getUserId().equals(currentUserId) && !m.getIsRead())
                     .collect(Collectors.toList());
             
             if (!unreadMessages.isEmpty()) {
                 for (Message m : unreadMessages) {
                     m.setIsRead(true);
                 }
                 messageRepository.saveAll(unreadMessages);
                 
                 // Evict conversation cache because unread count changed
                 evictConversationCache(currentUserId);
                 
                 // Evict messages cache because isRead status changed
                 evictMessagesCache(currentUserId, otherUserId);
             }
         }
    }

    // ================== Message Deletion Methods ==================
    
    @Transactional
@CacheEvict(value = "messages", allEntries = true)
public void deleteMessageForMe(Long userId, Long messageId) {
        // Verify message exists
        if (!messageRepository.existsById(messageId)) {
            throw new RuntimeException("Message not found");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Check if already deleted (idempotent)
        if (messageDeletionRepository.existsByMessage_IdAndUser_UserId(messageId, userId)) {
            return;
        }
        
        // Create deletion record
        MessageDeletion deletion = MessageDeletion.builder()
                .message(Message.builder().id(messageId).build())
                .user(user)
                .deletionType(MessageDeletion.DeletionType.FOR_ME)
                .deletedAt(LocalDateTime.now())
                .build();
        
        messageDeletionRepository.save(deletion);
        
        // Evict messages cache for this user
        Message msg = messageRepository.findById(messageId).orElse(null);
        if (msg != null) {
            evictMessagesCache(userId, msg.getSender().getUserId().equals(userId) 
                ? msg.getReceiver().getUserId() : msg.getSender().getUserId());
        }
    }
    
    @Transactional
@CacheEvict(value = "messages", allEntries = true)
public void deleteMessageForEveryone(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        // Verify sender owns this message (defense in depth)
        if (!message.getSender().getUserId().equals(userId)) {
            throw new RuntimeException("Can only delete your own messages");
        }
        
        // Check time limit (15 minutes)
        LocalDateTime fifteenMinutesAgo = LocalDateTime.now().minusMinutes(15);
        LocalDateTime messageTime = LocalDateTime.ofInstant(
            message.getCreatedAt(), ZoneId.systemDefault());
            
        if (messageTime.isBefore(fifteenMinutesAgo)) {
            throw new RuntimeException("Can only delete messages within 15 minutes");
        }
        
        // Check if already deleted for everyone
        if (messageDeletionRepository.findGlobalDeletionByMessageId(messageId).isPresent()) {
            return;
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Create deletion record
        MessageDeletion deletion = MessageDeletion.builder()
                .message(message)
                .user(user)
                .deletionType(MessageDeletion.DeletionType.FOR_EVERYONE)
                .deletedAt(LocalDateTime.now())
                .build();
        
        messageDeletionRepository.save(deletion);
        
        // Invalidate cache for BOTH users
        Long receiverId = message.getReceiver().getUserId();
        evictConversationCache(userId);
        evictConversationCache(receiverId);
        evictMessagesCache(userId, receiverId);
        
        // Send WebSocket notification to BOTH users (multi-device sync)
        notifyMessageDeleted(message, userId, receiverId);
    }
    
    @Transactional
@CacheEvict(value = "messages", allEntries = true)
public void clearConversation(Long userId, Long otherUserId) {
        // Get all message IDs efficiently
        List<Long> messageIds = messageRepository.findConversationMessageIds(userId, otherUserId);
        
        if (messageIds.isEmpty()) {
            return;
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Batch create deletion records
        List<MessageDeletion> deletions = messageIds.stream()
                .filter(msgId -> !messageDeletionRepository.existsByMessage_IdAndUser_UserId(msgId, userId))
                .map(msgId -> MessageDeletion.builder()
                        .message(Message.builder().id(msgId).build())
                        .user(user)
                        .deletionType(MessageDeletion.DeletionType.FOR_ME)
                        .deletedAt(LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());
        
        // Batch insert for efficiency
        if (!deletions.isEmpty()) {
            messageDeletionRepository.saveAll(deletions);
        }
        
        // Invalidate cache
        evictMessagesCache(userId, otherUserId);
        evictConversationCache(userId);
    }
    
    private void notifyMessageDeleted(Message message, Long senderId, Long receiverId) {
        ChatDTO.MessageDeletedEvent event = ChatDTO.MessageDeletedEvent.builder()
                .messageId(message.getId())
                .deletionType("FOR_EVERYONE")
                .deletedBy(senderId)
                .deletedAt(Instant.now())
                .build();
        
        // Notify BOTH users for multi-device sync
        User sender = userRepository.findById(senderId).orElseThrow();
        User receiver = userRepository.findById(receiverId).orElseThrow();
        
        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/message-deleted",
                event
        );
        
        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/message-deleted",
                event
        );
    }

    private void evictConversationCache(Long userId) {
        if (cacheManager != null) {
            var cache = cacheManager.getCache("conversations");
            if (cache != null) {
                cache.evict(userId);
            }
        }
    }

    private void evictMessagesCache(Long user1, Long user2) {
        if (cacheManager != null) {
            var cache = cacheManager.getCache("messages");
            if (cache != null) {
                // Key construction must match Cacheable key: min(u1,u2):max(u1,u2)
                long min = Math.min(user1, user2);
                long max = Math.max(user1, user2);
                cache.evict(min + ":" + max);
            }
        }
    }
}
