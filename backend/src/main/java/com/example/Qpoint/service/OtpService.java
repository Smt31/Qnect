package com.example.Qpoint.service;


import com.example.Qpoint.dto.VerifyOtpRequest;
import com.example.Qpoint.models.OtpPurpose;
import com.example.Qpoint.models.User;
import com.example.Qpoint.repository.UserRepository;
import com.example.Qpoint.util.OtpUtil;
import jakarta.transaction.Transactional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepo;
    private final BrevoMailService brevoMailService;
    private final PasswordEncoder passwordEncoder;

    public OtpService(StringRedisTemplate redisTemplate, UserRepository userRepo, BrevoMailService brevoMailService, PasswordEncoder passwordEncoder) {
        this.redisTemplate = redisTemplate;
        this.userRepo = userRepo;
        this.brevoMailService = brevoMailService;
        this.passwordEncoder = passwordEncoder;
    }

    public void sendOtp(String email, OtpPurpose purpose) {
        String code = OtpUtil.generateNumericOtp(6);
        
        // Store in Redis with 5 minutes TTL
        // Key format: otp:{email}
        String key = "otp:" + email;
        redisTemplate.opsForValue().set(key, code, 5, TimeUnit.MINUTES);

        try {
            brevoMailService.sendOtpEmail(email, code);
        } catch (Exception e) {
            // Fallback to console if Brevo is not configured
            System.err.println("\n⚠ EMAIL SEND FAILED - Using console fallback");
            System.err.println("Error: " + e.getMessage());
    
            System.out.println("========================================");
            System.out.println("OTP CODE: " + code);
            System.out.println("Email: " + email);
            System.out.println("Purpose: " + purpose);
            System.out.println("(Valid for 5 minutes)");
            System.out.println("========================================\n");
        }
    }

    @Transactional
    public Optional<User> verifyOtpAndCreateUser(VerifyOtpRequest req) {
        String key = "otp:" + req.getEmail();
        String storedCode = redisTemplate.opsForValue().get(key);

        if (storedCode == null || !storedCode.equals(req.getCode())) {
            return Optional.empty();
        }

        // OTP valid, delete it
        redisTemplate.delete(key);

        User user = userRepo.findByEmail(req.getEmail()).orElseGet(() -> {
            String finalUsername;
            if (req.getUsername() != null && !req.getUsername().isBlank()) {
                 if (userRepo.existsByUsername(req.getUsername())) {
                     throw new RuntimeException("Username '" + req.getUsername() + "' is already taken.");
                 }
                 finalUsername = req.getUsername();
            } else {
                 finalUsername = buildUsername(req.getEmail(), null);
            }

            String fullName = (req.getFullName() == null || req.getFullName().isBlank())
                    ? finalUsername
                    : req.getFullName();

            User.UserBuilder builder = User.builder()
                    .email(req.getEmail())
                    .username(finalUsername)
                    .fullName(fullName)
                    .mobileNumber(req.getMobileNumber())
                    .avatarUrl(req.getAvatarUrl())
                    .bio(req.getBio())

                    .answersCount(0)
                    .questionsCount(0)
                    .followersCount(0)
                    .followingCount(0)
                    .reputation(0)

                    .createdAt(Instant.now())
                    .updatedAt(Instant.now());
            

            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                builder.passwordHash(passwordEncoder.encode(req.getPassword()));
            }
            
            return userRepo.save(builder.build());
        });

        boolean updated = false;
        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            if (!req.getUsername().equals(user.getUsername())) {
                if (userRepo.existsByUsername(req.getUsername())) {
                    throw new RuntimeException("Username '" + req.getUsername() + "' is already taken.");
                }
                user.setUsername(req.getUsername());
                updated = true;
            }
        }
        if (req.getFullName() != null && !req.getFullName().isBlank()) { 
            user.setFullName(req.getFullName()); 
            updated = true; 
        }
        if (req.getFirstName() != null && !req.getFirstName().isBlank() && req.getLastName() != null && !req.getLastName().isBlank()) {
            // Update fullName from firstName + lastName if provided
            user.setFullName(req.getFirstName() + " " + req.getLastName());
            updated = true;
        }
        if (req.getMobileNumber() != null) { user.setMobileNumber(req.getMobileNumber()); updated = true; }
        if (req.getAvatarUrl() != null) { user.setAvatarUrl(req.getAvatarUrl()); updated = true; }
        if (req.getBio() != null) { user.setBio(req.getBio()); updated = true; }
        
        // Update password if provided
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
            updated = true;
        }

        if (updated) userRepo.save(user);

        return Optional.of(user);
    }

    private String buildUsername(String email, String requestedUsername) {
        if (requestedUsername != null && !requestedUsername.isBlank() && !userRepo.existsByUsername(requestedUsername)) {
            return requestedUsername.trim();
        }
        String localPart = email != null && email.contains("@")
                ? email.substring(0, email.indexOf('@'))
                : "user";
        String candidate = localPart.replaceAll("[^a-zA-Z0-9_]", "_");
        int suffix = (int) (Math.random() * 9000) + 1000;
        return candidate + "_" + suffix;
    }
}
