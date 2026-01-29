package com.example.Qpoint.repository;

import com.example.Qpoint.models.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    
    @Query("SELECT gm FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.user.userId = :userId")
    Optional<GroupMember> findByGroupIdAndUserId(@Param("groupId") Long groupId, @Param("userId") Long userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.userId = :userId AND gm.leftAt IS NULL")
    List<GroupMember> findActiveGroupsByUserId(@Param("userId") Long userId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.user WHERE gm.group.id = :groupId AND gm.leftAt IS NULL")
    List<GroupMember> findActiveMembersByGroupId(@Param("groupId") Long groupId);
    
    // Check if user is active member
    @Query("SELECT COUNT(gm) > 0 FROM GroupMember gm WHERE gm.group.id = :groupId AND gm.user.userId = :userId AND gm.leftAt IS NULL")
    boolean isUserActiveMember(@Param("groupId") Long groupId, @Param("userId") Long userId);

    // Delete all members of a group
    void deleteAllByGroupId(Long groupId);
}
