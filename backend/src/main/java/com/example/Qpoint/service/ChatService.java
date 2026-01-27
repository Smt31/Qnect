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
    private final AnswerRepository answerRepository;
    private final PostRepository postRepository;
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

    @Transactional
    public ChatDTO.MessageResponse sendMessage(Long senderId, ChatDTO.MessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        // Check messaging permissions (kept same as original)
        boolean canMessage = false;
        
        if (followRepository.existsByFollowerAndFollowing(sender, receiver) && 
            followRepository.existsByFollowerAndFollowing(receiver, sender)) {
            canMessage = true;
        }
        else if (conversationRepository.findConversationByUsers(senderId, request.getReceiverId()).isPresent()) {
            canMessage = true;
        }
        else if (answerRequestRepository.existsByRequestedByAndRequestedTo(sender, receiver) ||
                 answerRequestRepository.existsByRequestedByAndRequestedTo(receiver, sender)) {
            canMessage = true;
        }
        else if (Boolean.TRUE.equals(receiver.getAllowPublicMessages())) {
            canMessage = true;
        }
        
        if (!canMessage) {
            throw new RuntimeException("Cannot message this user - no connection exists and public messages are not allowed");
        }

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

        // Manually evict cache for BOTH users since conversation list changed/reordered
        evictConversationCache(senderId);
        evictConversationCache(receiver.getUserId());
        
        // Evict messages cache for this conversation pair
        evictMessagesCache(senderId, receiver.getUserId());

        ChatDTO.MessageResponse response = ChatDTO.MessageResponse.builder()
                .id(savedMessage.getId())
                .senderId(sender.getUserId())
                .senderUsername(sender.getUsername())
                .senderAvatar(sender.getAvatarUrl())
                .receiverId(receiver.getUserId())
                .content(savedMessage.getContent())
                .type(savedMessage.getType().name())
                .attachmentUrl(savedMessage.getAttachmentUrl())
                .sharedPost(buildSharedPostDto(message.getSharedPost())) // Use message.getSharedPost() which we know is correct
                .createdAt(savedMessage.getCreatedAt())
                .isRead(false)
                .build();

        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                response
        );

        return response;
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

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.get().getId());
        
        return messages.stream().map(m -> ChatDTO.MessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender().getUserId())
                .senderUsername(m.getSender().getUsername())
                .senderAvatar(m.getSender().getAvatarUrl())
                .receiverId(m.getReceiver().getUserId())
                .content(m.getContent())
                .type(m.getType().name())
                .attachmentUrl(m.getAttachmentUrl())
                .sharedPost(buildSharedPostDto(m.getSharedPost()))
                .createdAt(m.getCreatedAt())
                .isRead(m.getIsRead())
                .build())
                .collect(Collectors.toList());
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
