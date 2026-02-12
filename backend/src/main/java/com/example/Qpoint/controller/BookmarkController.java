package com.example.Qpoint.controller;

import com.example.Qpoint.dto.BookmarkItemDto;
import com.example.Qpoint.models.Bookmark;
import com.example.Qpoint.service.BookmarkService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import com.example.Qpoint.config.CustomUserDetails;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @PostMapping("/{postId}")
    public ResponseEntity<Void> bookmarkPost(@PathVariable Long postId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        bookmarkService.bookmarkPost(userId, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> unbookmarkPost(@PathVariable Long postId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        bookmarkService.unbookmarkPost(userId, postId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<Page<BookmarkItemDto>> getMyBookmarks(Authentication authentication,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "10") int size) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        Page<BookmarkItemDto> bookmarks = bookmarkService.getUserBookmarks(userId, page, size);
        return ResponseEntity.ok(bookmarks);
    }

    @GetMapping("/{postId}/status")
    public ResponseEntity<Boolean> isBookmarked(@PathVariable Long postId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }
        
        Long userId = ((CustomUserDetails) principal).getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        return ResponseEntity.ok(bookmarkService.isPostBookmarked(userId, postId));
    }
}
