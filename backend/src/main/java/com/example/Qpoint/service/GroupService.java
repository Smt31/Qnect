package com.example.Qpoint.service;

import com.example.Qpoint.dto.GroupDTO;
import com.example.Qpoint.models.Group;
import com.example.Qpoint.models.GroupMember;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.GroupMemberRepository;
import com.example.Qpoint.repository.GroupRepository;
import com.example.Qpoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public GroupDTO.GroupResponse createGroup(Long creatorId, GroupDTO.CreateGroupRequest request) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .avatarUrl(request.getAvatarUrl())
                .createdBy(creator)
                .isPrivate(false)
                .build();
        
        group = groupRepository.save(group);

        // Add creator as ADMIN
        addMemberInternal(group, creator, GroupMember.Role.ADMIN);

        // Add users
        if (request.getMemberIds() != null) {
            Group finalGroup = group;
            request.getMemberIds().stream()
                    .distinct()
                    .filter(uid -> !uid.equals(creatorId))
                    .forEach(uid -> {
                         userRepository.findById(uid).ifPresent(u -> 
                             addMemberInternal(finalGroup, u, GroupMember.Role.MEMBER));
                    });
        }

        return mapToResponse(group, creatorId);
    }

    private void addMemberInternal(Group group, User user, GroupMember.Role role) {
        Optional<GroupMember> existing = groupMemberRepository.findByGroupIdAndUserId(group.getId(), user.getUserId());
        
        if (existing.isPresent()) {
            GroupMember member = existing.get();
            // Rejoin logic: Clean Slate
            if (member.getLeftAt() != null) {
                member.setLeftAt(null);
                member.setJoinedAt(LocalDateTime.now());
                member.setRole(role); // Update role if needed
                groupMemberRepository.save(member);
            }
            // If already active, do nothing
        } else {
            GroupMember member = GroupMember.builder()
                    .group(group)
                    .user(user)
                    .role(role)
                    .joinedAt(LocalDateTime.now())
                    .build();
            groupMemberRepository.save(member);
        }
    }

    /**
     * Get Group Details. Caches metadata.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "groups", key = "#groupId")
    public GroupDTO.GroupResponse getGroupDetails(Long groupId, Long currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        
        return mapToResponse(group, currentUserId);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void addMembers(Long groupId, Long currentUserId, List<Long> userIds) {
        // Any member can add users (Public Group logic)
        if (!groupMemberRepository.isUserActiveMember(groupId, currentUserId)) {
            throw new RuntimeException("You are not a member of this group");
        }

        Group group = groupRepository.findById(groupId).orElseThrow();
        
        for (Long uid : userIds) {
            userRepository.findById(uid).ifPresent(user -> 
                addMemberInternal(group, user, GroupMember.Role.MEMBER));
        }
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void removeMember(Long groupId, Long adminId, Long targetUserId) {
        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, adminId)
                .orElseThrow(() -> new RuntimeException("Not a member"));
        
        if (admin.getRole() != GroupMember.Role.ADMIN) {
             throw new RuntimeException("Only Admins can remove members");
        }

        GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));
        
        target.setLeftAt(LocalDateTime.now());
        groupMemberRepository.save(target);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void leaveGroup(Long groupId, Long userId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Not a member"));
        
        member.setLeftAt(LocalDateTime.now());
        groupMemberRepository.save(member);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void promoteToAdmin(Long groupId, Long currentUserId, Long targetUserId) {
        GroupMember currentMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Not a member"));
        
        if (currentMember.getRole() != GroupMember.Role.ADMIN) {
            throw new RuntimeException("Only admins can promote members");
        }

        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found in group"));
        
        if (targetMember.getLeftAt() != null) {
            throw new RuntimeException("Target user has left the group");
        }

        targetMember.setRole(GroupMember.Role.ADMIN);
        groupMemberRepository.save(targetMember);
        
        log.info("User {} promoted user {} to admin in group {}", currentUserId, targetUserId, groupId);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void demoteFromAdmin(Long groupId, Long currentUserId, Long targetUserId) {
        GroupMember currentMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Not a member"));
        
        if (currentMember.getRole() != GroupMember.Role.ADMIN) {
            throw new RuntimeException("Only admins can demote members");
        }

        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found in group"));
        
        if (targetMember.getRole() != GroupMember.Role.ADMIN) {
             throw new RuntimeException("Target user is not an admin");
        }
        
        // Check if target is the creator
        if (targetMember.getGroup().getCreatedBy().getUserId().equals(targetUserId)) {
            throw new RuntimeException("Cannot remove admin privileges from the group creator");
        }

        targetMember.setRole(GroupMember.Role.MEMBER);
        groupMemberRepository.save(targetMember);
        
        log.info("User {} demoted user {} from admin in group {}", currentUserId, targetUserId, groupId);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public GroupDTO.GroupResponse updateGroup(Long groupId, Long currentUserId, GroupDTO.UpdateGroupRequest request) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Not a member"));

        if (member.getRole() != GroupMember.Role.ADMIN) {
            throw new RuntimeException("Only admins can update group details");
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            group.setName(request.getName());
        }
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription());
        }
        if (request.getAvatarUrl() != null) {
            group.setAvatarUrl(request.getAvatarUrl());
        }

        groupRepository.save(group);
        log.info("User {} updated group {}", currentUserId, groupId);
        
        return mapToResponse(group, currentUserId);
    }

    @Transactional
    @CacheEvict(value = "groups", key = "#groupId")
    public void deleteGroup(Long groupId, Long currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Only the creator can delete the group
        if (!group.getCreatedBy().getUserId().equals(currentUserId)) {
            throw new RuntimeException("Only the group creator can delete the group");
        }

        // Delete all group members first
        groupMemberRepository.deleteAllByGroupId(groupId);
        
        // Delete the group
        groupRepository.delete(group);
        log.info("User {} deleted group {}", currentUserId, groupId);
    }
    
    @Transactional(readOnly = true)
    public List<GroupDTO.GroupResponse> getMyGroups(Long userId) {
        List<GroupMember> memberships = groupMemberRepository.findActiveGroupsByUserId(userId);
        return memberships.stream()
                .map(gm -> mapToResponse(gm.getGroup(), userId))
                .collect(Collectors.toList());
    }

    // Mapping Helper
    private GroupDTO.GroupResponse mapToResponse(Group group, Long currentUserId) {
        List<GroupMember> activeMembers = groupMemberRepository.findActiveMembersByGroupId(group.getId());
        
        boolean isMember = false;
        boolean isAdmin = false;
        
        for (GroupMember gm : activeMembers) {
            if (gm.getUser().getUserId().equals(currentUserId)) {
                isMember = true;
                if (gm.getRole() == GroupMember.Role.ADMIN) isAdmin = true;
                break;
            }
        }
        
        List<GroupDTO.MemberDto> memberDtos = activeMembers.stream()
            .map(gm -> new GroupDTO.MemberDto(
                gm.getUser().getUserId(),
                gm.getUser().getUsername(),
                gm.getUser().getFullName(),
                gm.getUser().getAvatarUrl(),
                gm.getRole(),
                gm.getJoinedAt()
            )).collect(Collectors.toList());

        return GroupDTO.GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .createdBy(group.getCreatedBy().getUserId())
                .isPrivate(group.isPrivate())
                .createdAt(group.getCreatedAt())
                .members(memberDtos)
                .isMember(isMember)
                .isAdmin(isAdmin)
                .build();
    }
}
