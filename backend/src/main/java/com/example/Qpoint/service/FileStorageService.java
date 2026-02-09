package com.example.Qpoint.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class FileStorageService {

    private final Cloudinary cloudinary;

    public FileStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String store(MultipartFile file) {
        try {
            // Validate file
            validateFile(file);

            // Upload to Cloudinary
            Map uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "qpoint/",
                            "resource_type", "auto",
                            "use_filename", true,
                            "unique_filename", true));

            // Return the public URL
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Cloudinary", e);
        }
    }

    private void validateFile(MultipartFile file) {
        // Validate file size (max 10MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new RuntimeException("File size exceeds 10MB limit");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType != null && !isValidImageType(contentType)) {
            throw new RuntimeException("Invalid file type. Only images are allowed.");
        }
    }

    public void delete(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return;
        }

        try {
            String publicId = extractPublicId(imageUrl);
            if (publicId != null) {
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file from Cloudinary", e);
        }
    }

    private String extractPublicId(String imageUrl) {
        // Example URL:
        // https://res.cloudinary.com/demo/image/upload/v1570979139/qpoint/sample.jpg
        try {
            int qpointIndex = imageUrl.indexOf("qpoint/");
            if (qpointIndex != -1) {
                int dotIndex = imageUrl.lastIndexOf('.');
                if (dotIndex > qpointIndex) {
                    return imageUrl.substring(qpointIndex, dotIndex);
                }
            }
        } catch (Exception e) {
            // Log warning but don't fail
            System.err.println("Could not extract public ID from URL: " + imageUrl);
        }
        return null;
    }

    private boolean isValidImageType(String contentType) {
        return contentType != null && (contentType.startsWith("image/jpeg") ||
                contentType.startsWith("image/jpg") ||
                contentType.startsWith("image/png") ||
                contentType.startsWith("image/gif") ||
                contentType.startsWith("image/webp"));
    }
}