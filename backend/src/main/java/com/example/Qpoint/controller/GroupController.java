package com.example.Qpoint.controller;

import com.example.Qpoint.dto.GroupChatDTO;
import com.example.Qpoint.dto.GroupDTO;
import com.example.Qpoint.models.User;
import com.example.Qpoint.service.GroupChatService;
import com.example.Qpoint.service.GroupService;
import com.example.Qpoint.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final GroupChatService groupChatService;
    private final UserService userService;

    // --- Management ---

    @PostMapping
    public ResponseEntity<GroupDTO.GroupResponse> createGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody GroupDTO.CreateGroupRequest request) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupService.createGroup(user.getUserId(), request));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDTO.GroupResponse> getGroupDetails(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupService.getGroupDetails(groupId, user.getUserId()));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<Void> addMembers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @RequestBody GroupDTO.AddMemberRequest request) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.addMembers(groupId, user.getUserId(), request.getUserIds());
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{groupId}/members/{targetUserId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long targetUserId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.removeMember(groupId, user.getUserId(), targetUserId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.leaveGroup(groupId, user.getUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{groupId}/promote/{targetUserId}")
    public ResponseEntity<Void> promoteToAdmin(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long targetUserId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.promoteToAdmin(groupId, user.getUserId(), targetUserId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{groupId}/demote/{targetUserId}")
    public ResponseEntity<Void> demoteFromAdmin(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long targetUserId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.demoteFromAdmin(groupId, user.getUserId(), targetUserId);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/my")
    public ResponseEntity<List<GroupDTO.GroupResponse>> getMyGroups(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupService.getMyGroups(user.getUserId()));
    }

    @GetMapping("/public")
    public ResponseEntity<List<GroupDTO.GroupResponse>> getPublicGroups(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = null;
        if (userDetails != null) {
            User user = userService.findByUsername(userDetails.getUsername());
            userId = user.getUserId();
        }
        return ResponseEntity.ok(groupService.getPublicGroups(userId));
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<GroupDTO.GroupResponse> joinGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupService.joinPublicGroup(groupId, user.getUserId()));
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<GroupDTO.GroupResponse> updateGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @RequestBody GroupDTO.UpdateGroupRequest request) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupService.updateGroup(groupId, user.getUserId(), request));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupService.deleteGroup(groupId, user.getUserId());
        return ResponseEntity.ok().build();
    }

    // --- Messaging (Fetch History) ---

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupChatDTO.MessageResponse>> getMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PageableDefault(size = 50) Pageable pageable) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupChatService.getGroupMessages(groupId, user.getUserId(), pageable));
    }

    @PostMapping("/{groupId}/send")
    public ResponseEntity<GroupChatDTO.MessageResponse> sendMessage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @RequestBody GroupChatDTO.SendMessageRequest request) {
        User user = userService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(groupChatService.sendMessage(groupId, user.getUserId(), request));
    }
    
    // Deletion
    @DeleteMapping("/messages/{messageId}/everyone")
    public ResponseEntity<Void> deleteForEveryone(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long messageId) {
        User user = userService.findByUsername(userDetails.getUsername());
        groupChatService.deleteMessageForEveryone(messageId, user.getUserId());
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/messages/{messageId}/me")
    public ResponseEntity<Void> deleteForMe(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long messageId) {
         User user = userService.findByUsername(userDetails.getUsername());
         groupChatService.deleteMessageForMe(messageId, user.getUserId());
         return ResponseEntity.ok().build();
    }
}
