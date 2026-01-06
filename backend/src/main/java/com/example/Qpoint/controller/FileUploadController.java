package com.example.Qpoint.controller;

import com.example.Qpoint.service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private final FileStorageService fileStorageService;

    public FileUploadController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String imageUrl = fileStorageService.store(file);

        Map<String, String> response = new HashMap<>();
        response.put("url", imageUrl);
        response.put("filename", extractFilenameFromUrl(imageUrl));

        return ResponseEntity.ok(response);
    }

    private String extractFilenameFromUrl(String url) {
        // Extract filename from Cloudinary URL
        int lastSlashIndex = url.lastIndexOf('/');
        int lastDotIndex = url.lastIndexOf('.');
        if (lastSlashIndex != -1 && lastDotIndex > lastSlashIndex) {
            return url.substring(lastSlashIndex + 1);
        }
        return url.substring(lastSlashIndex + 1);
    }
}