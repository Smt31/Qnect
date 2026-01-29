package com.example.Qpoint.repository;

import com.example.Qpoint.models.GroupMessageDeletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupMessageDeletionRepository extends JpaRepository<GroupMessageDeletion, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT gmd FROM GroupMessageDeletion gmd WHERE gmd.message.id = :messageId AND gmd.user.userId = :userId")
    Optional<GroupMessageDeletion> findByMessageIdAndUserId(@org.springframework.data.repository.query.Param("messageId") Long messageId, @org.springframework.data.repository.query.Param("userId") Long userId);
    
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(gmd) > 0 FROM GroupMessageDeletion gmd WHERE gmd.message.id = :messageId AND gmd.user.userId = :userId AND gmd.deletionType = :deletionType")
    boolean existsByMessageIdAndUserIdAndDeletionType(@org.springframework.data.repository.query.Param("messageId") Long messageId, @org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("deletionType") GroupMessageDeletion.DeletionType deletionType);
}
