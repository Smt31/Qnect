package com.example.Qpoint.repository;

import com.example.Qpoint.models.MessageDeletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageDeletionRepository extends JpaRepository<MessageDeletion, Long> {
    
    boolean existsByMessage_IdAndUser_UserId(Long messageId, Long userId);
    
    Optional<MessageDeletion> findByMessage_IdAndUser_UserId(Long messageId, Long userId);
    
    @Query("SELECT md.message.id FROM MessageDeletion md WHERE md.user.userId = :userId")
    List<Long> findDeletedMessageIdsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT md FROM MessageDeletion md WHERE md.deletionType = 'FOR_EVERYONE' AND md.message.id = :messageId")
    Optional<MessageDeletion> findGlobalDeletionByMessageId(@Param("messageId") Long messageId);
}
