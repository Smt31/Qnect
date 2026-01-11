package com.example.Qpoint.service;

import com.example.Qpoint.dto.NotificationDto;
import com.example.Qpoint.models.Notification;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.NotificationRepository;
import com.example.Qpoint.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void createNotification(Long recipientId, Long senderId, Notification.NotificationType type, Long referenceId, String message) {
        if (recipientId.equals(senderId)) return; // Don't notify self

        User recipient = userRepository.findById(recipientId).orElseThrow(() -> new RuntimeException("Recipient not found"));
        User sender = senderId != null ? userRepository.findById(senderId).orElse(null) : null;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .sender(sender)
                .type(type.name())
                .referenceId(referenceId)
                .message(message)
                .build();

        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> getUserNotifications(Long userId, int page, int size) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Page<Notification> notifications = notificationRepository.findByRecipientOrderByCreatedAtDesc(user, PageRequest.of(page, size));
        
        // Convert to DTOs
        return notifications.map(NotificationDto::fromEntity);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getRecipient().getUserId().equals(userId)) {
             throw new RuntimeException("Not authorized");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
    
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.countByRecipientAndIsReadFalse(user);
    }
    
    @Transactional
    public void markAllAsRead(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepository.markAllAsReadByRecipient(user);
    }
    
    @Transactional
    public void clearAllNotifications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepository.deleteByRecipient(user);
    }
}

