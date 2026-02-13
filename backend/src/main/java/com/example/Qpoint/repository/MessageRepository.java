package com.example.Qpoint.repository;

import com.example.Qpoint.models.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    
    // Count unread messages for a specific conversation and receiver
    long countByConversationIdAndReceiverUserIdAndIsReadFalse(Long conversationId, Long receiverId);
    
    // Query-level filtering:
    // 1. Always hide messages deleted "FOR_ME" (by current user)
    // 2. Return messages deleted "FOR_EVERYONE" but mark them so we can show placeholder
    @Query("""
        SELECT m, 
               CASE WHEN EXISTS (
                   SELECT 1 FROM MessageDeletion md 
                   WHERE md.message = m 
                   AND md.deletionType = 'FOR_EVERYONE'
               ) THEN true ELSE false END as deletedForEveryone
        FROM Message m
        WHERE m.conversation.id = :conversationId
        AND NOT EXISTS (
            SELECT 1 FROM MessageDeletion md
            WHERE md.message = m
            AND md.user.userId = :userId
            AND md.deletionType = 'FOR_ME'
        )
        ORDER BY m.createdAt ASC
        """)
    List<Object[]> findMessagesWithVisibility(
        @Param("conversationId") Long conversationId,
        @Param("userId") Long userId
    );

    // Cursor-based pagination: get latest N messages (initial load)
    @Query("""
        SELECT m, 
               CASE WHEN EXISTS (
                   SELECT 1 FROM MessageDeletion md 
                   WHERE md.message = m 
                   AND md.deletionType = 'FOR_EVERYONE'
               ) THEN true ELSE false END as deletedForEveryone
        FROM Message m
        WHERE m.conversation.id = :conversationId
        AND NOT EXISTS (
            SELECT 1 FROM MessageDeletion md
            WHERE md.message = m
            AND md.user.userId = :userId
            AND md.deletionType = 'FOR_ME'
        )
        ORDER BY m.createdAt DESC
        """)
    List<Object[]> findMessagesWithVisibilityPaginated(
        @Param("conversationId") Long conversationId,
        @Param("userId") Long userId,
        org.springframework.data.domain.Pageable pageable
    );

    // Cursor-based pagination: get N messages BEFORE a cursor (scroll-up)
    @Query("""
        SELECT m, 
               CASE WHEN EXISTS (
                   SELECT 1 FROM MessageDeletion md 
                   WHERE md.message = m 
                   AND md.deletionType = 'FOR_EVERYONE'
               ) THEN true ELSE false END as deletedForEveryone
        FROM Message m
        WHERE m.conversation.id = :conversationId
        AND m.id < :cursorId
        AND NOT EXISTS (
            SELECT 1 FROM MessageDeletion md
            WHERE md.message = m
            AND md.user.userId = :userId
            AND md.deletionType = 'FOR_ME'
        )
        ORDER BY m.createdAt DESC
        """)
    List<Object[]> findMessagesWithVisibilityBeforeCursor(
        @Param("conversationId") Long conversationId,
        @Param("userId") Long userId,
        @Param("cursorId") Long cursorId,
        org.springframework.data.domain.Pageable pageable
    );
    
    // For clear conversation: get all message IDs efficiently
    @Query("""
        SELECT m.id FROM Message m
        WHERE m.conversation.id = (
            SELECT c.id FROM Conversation c
            WHERE (c.user1.userId = :userId AND c.user2.userId = :otherUserId)
               OR (c.user1.userId = :otherUserId AND c.user2.userId = :userId)
        )
        """)
    List<Long> findConversationMessageIds(
        @Param("userId") Long userId,
        @Param("otherUserId") Long otherUserId
    );
}
