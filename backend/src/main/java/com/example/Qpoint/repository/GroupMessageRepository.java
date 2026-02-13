package com.example.Qpoint.repository;

import com.example.Qpoint.models.GroupMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {

    /**
     * Fetch messages for a group visible to the user.
     * Rules:
     * 1. Message created AFTER user joined.
     * 2. Message NOT deleted 'FOR_ME' by user.
     * 3. Return 'deletedForEveryone' flag as boolean.
     * Optimized with JOIN FETCH to prevent N+1 on sender, group, and shared post.
     */
    @Query("SELECT m, " +
           "(CASE WHEN EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.deletionType = 'FOR_EVERYONE') THEN true ELSE false END) " +
           "FROM GroupMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.group " +
           "LEFT JOIN FETCH m.sharedPost sp " +
           "LEFT JOIN FETCH sp.author " +
           "WHERE m.group.id = :groupId " +
           "AND m.createdAt >= (SELECT mem.joinedAt FROM GroupMember mem WHERE mem.group.id = :groupId AND mem.user.id = :userId) " +
           "AND NOT EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.user.id = :userId AND d.deletionType = 'FOR_ME') " +
           "ORDER BY m.createdAt ASC")
    List<Object[]> findVisibleMessages(@Param("groupId") Long groupId, @Param("userId") Long userId, Pageable pageable);

    // Cursor-based: get latest N messages (initial load) — DESC order
    @Query("SELECT m, " +
           "(CASE WHEN EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.deletionType = 'FOR_EVERYONE') THEN true ELSE false END) " +
           "FROM GroupMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.group " +
           "LEFT JOIN FETCH m.sharedPost sp " +
           "LEFT JOIN FETCH sp.author " +
           "WHERE m.group.id = :groupId " +
           "AND m.createdAt >= (SELECT mem.joinedAt FROM GroupMember mem WHERE mem.group.id = :groupId AND mem.user.id = :userId) " +
           "AND NOT EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.user.id = :userId AND d.deletionType = 'FOR_ME') " +
           "ORDER BY m.createdAt DESC")
    List<Object[]> findVisibleMessagesPaginated(@Param("groupId") Long groupId, @Param("userId") Long userId, Pageable pageable);

    // Cursor-based: get N messages BEFORE cursor — DESC order
    @Query("SELECT m, " +
           "(CASE WHEN EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.deletionType = 'FOR_EVERYONE') THEN true ELSE false END) " +
           "FROM GroupMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.group " +
           "LEFT JOIN FETCH m.sharedPost sp " +
           "LEFT JOIN FETCH sp.author " +
           "WHERE m.group.id = :groupId " +
           "AND m.id < :cursorId " +
           "AND m.createdAt >= (SELECT mem.joinedAt FROM GroupMember mem WHERE mem.group.id = :groupId AND mem.user.id = :userId) " +
           "AND NOT EXISTS (SELECT d FROM GroupMessageDeletion d WHERE d.message = m AND d.user.id = :userId AND d.deletionType = 'FOR_ME') " +
           "ORDER BY m.createdAt DESC")
    List<Object[]> findVisibleMessagesBeforeCursor(@Param("groupId") Long groupId, @Param("userId") Long userId, @Param("cursorId") Long cursorId, Pageable pageable);
}
