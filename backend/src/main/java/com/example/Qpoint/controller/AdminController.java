package com.example.Qpoint.controller;

import com.example.Qpoint.config.CustomUserDetails;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.CommentRepository;
import com.example.Qpoint.repository.PostRepository;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.repository.GroupRepository;
import com.example.Qpoint.service.PostService;
import com.example.Qpoint.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final GroupRepository groupRepository;
    private final com.example.Qpoint.repository.GroupMemberRepository groupMemberRepository;
    private final PostService postService;
    private final UserService userService;

    // ========================
    // Platform Statistics
    // ========================

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalPosts", postRepository.count());
        stats.put("totalComments", commentRepository.count());
        stats.put("totalGroups", groupRepository.count());
        return ResponseEntity.ok(stats);
    }

    // ========================
    // User Management
    // ========================

    @GetMapping("/users")
    public ResponseEntity<Page<Map<String, Object>>> getUsers(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<User> users;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        if (query != null && !query.trim().isEmpty()) {
            users = userRepository.searchUsers(query, pageRequest);
        } else {
            users = userRepository.findAll(pageRequest);
        }

        Page<Map<String, Object>> mapped = users.map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("userId", u.getUserId());
            m.put("username", u.getUsername());
            m.put("email", u.getEmail());
            m.put("fullName", u.getFullName());
            m.put("avatarUrl", u.getAvatarUrl());
            m.put("role", u.getRole());
            m.put("reputation", u.getReputation());
            m.put("createdAt", u.getCreatedAt());
            return m;
        });

        return ResponseEntity.ok(mapped);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        CustomUserDetails admin = (CustomUserDetails) authentication.getPrincipal();

        // Safety: admin cannot delete themselves
        if (admin.getUserId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot delete your own account"));
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ========================
    // Post Moderation
    // ========================

    @GetMapping("/posts")
    public ResponseEntity<Page<Map<String, Object>>> getPosts(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<com.example.Qpoint.models.Post> posts;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        if (query != null && !query.trim().isEmpty()) {
            posts = postRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(query, query, pageRequest);
        } else {
            posts = postRepository.findAll(pageRequest);
        }

        Page<Map<String, Object>> mapped = posts.map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("title", p.getTitle());
            m.put("createdAt", p.getCreatedAt());
            m.put("authorName", p.getAuthor() != null ? p.getAuthor().getFullName() : "Unknown");
            m.put("authorUsername", p.getAuthor() != null ? p.getAuthor().getUsername() : "unknown");
            m.put("commentsCount", p.getCommentsCount());
            return m;
        });

        return ResponseEntity.ok(mapped);
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        if (!postRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        postRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }

    // ========================
    // Comment Moderation
    // ========================

    @GetMapping("/comments")
    public ResponseEntity<Page<Map<String, Object>>> getComments(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<com.example.Qpoint.models.Comment> comments;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        if (query != null && !query.trim().isEmpty()) {
            comments = commentRepository.findByContentContainingIgnoreCaseWithAuthor(query, pageRequest);
        } else {
            comments = commentRepository.findAllWithAuthor(pageRequest);
        }

        Page<Map<String, Object>> mapped = comments.map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("content", c.getContent());
            m.put("createdAt", c.getCreatedAt());
            m.put("authorName", c.getAuthor() != null ? c.getAuthor().getFullName() : "Unknown");
            m.put("authorUsername", c.getAuthor() != null ? c.getAuthor().getUsername() : "unknown");
            m.put("postId", c.getPost() != null ? c.getPost().getId() : null);
            return m;
        });

        return ResponseEntity.ok(mapped);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        if (!commentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        commentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Comment deleted successfully"));
    }

    // ========================
    // Group Moderation
    // ========================

    @GetMapping("/groups")
    public ResponseEntity<Page<Map<String, Object>>> getGroups(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<com.example.Qpoint.models.Group> groups;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        if (query != null && !query.trim().isEmpty()) {
            groups = groupRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseWithCreator(query, query, pageRequest);
        } else {
            groups = groupRepository.findAllWithCreator(pageRequest);
        }

        Page<Map<String, Object>> mapped = groups.map(g -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", g.getId());
            m.put("name", g.getName());
            m.put("createdAt", g.getCreatedAt());
            m.put("creatorName", g.getCreatedBy() != null ? g.getCreatedBy().getFullName() : "Unknown");
            m.put("membersCount", groupMemberRepository.countByGroupIdAndLeftAtIsNull(g.getId()));
            return m;
        });

        return ResponseEntity.ok(mapped);
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long id) {
        if (!groupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        groupRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
    }

    // ========================
    // Role Management
    // ========================

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        if (newRole == null || (!newRole.equals("USER") && !newRole.equals("ADMIN"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role. Must be USER or ADMIN"));
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        user.setRole(newRole);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Role updated to " + newRole));
    }
}
