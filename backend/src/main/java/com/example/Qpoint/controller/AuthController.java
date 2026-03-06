package com.example.Qpoint.controller;

import com.example.Qpoint.dto.AuthResponse;
import com.example.Qpoint.dto.LoginRequest;
import com.example.Qpoint.dto.SendOtpRequest;
import com.example.Qpoint.dto.VerifyOtpRequest;
import com.example.Qpoint.models.User;
import com.example.Qpoint.service.OtpService;
import com.example.Qpoint.service.UserService;
import com.example.Qpoint.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final OtpService otpService;
    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final long accessTokenTtlMs;

    public AuthController(OtpService otpService,
                          UserService userService,
                          JwtUtil jwtUtil,
                          // Default to 10 hours if not overridden
                          @Value("${jwt.access.expiration:36000000}") long accessTokenTtlMs) {
        this.otpService = otpService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.accessTokenTtlMs = accessTokenTtlMs;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        otpService.sendOtp(req.getEmail(), req.getPurpose());
        return ResponseEntity.ok(new AuthResponse(true, "OTP sent successfully", null, null, null, null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        Optional<User> user = otpService.verifyOtpAndCreateUser(req);
        if (user.isEmpty()) {
            return ResponseEntity.badRequest().body(new AuthResponse(false, "Invalid/expired OTP", null, null, null, null));
        }

        User u = user.get();
        String token = jwtUtil.generateToken(u.getUserId(), u.getEmail(), u.getUsername(), u.getRole(), accessTokenTtlMs);
        return ResponseEntity.ok(
                new AuthResponse(
                        true,
                        "OTP verified, user created/updated",
                        token,
                        u.getUserId(),
                        u.getEmail(),
                        u.getUsername()
                )
        );
    }

    @GetMapping("/check-username/{username}")
    public ResponseEntity<?> checkUsernameAvailability(@PathVariable String username) {
        boolean isTaken = userService.isUsernameTaken(username);
        return ResponseEntity.ok(java.util.Map.of(
                "available", !isTaken,
                "username", username
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            // Validate credentials using BCrypt and load user
            User user = userService.login(req.getEmail(), req.getPassword());

            // Issue JWT directly on successful login
            String token = jwtUtil.generateToken(user.getUserId(), user.getEmail(), user.getUsername(), user.getRole(), accessTokenTtlMs);

            return ResponseEntity.ok(
                    new AuthResponse(
                            true,
                            "Login successful",
                            token,
                            user.getUserId(),
                            user.getEmail(),
                            user.getUsername()
                    )
            );
        } catch (Exception e) {
            // Wrong credentials or other auth failures should return 401
            return ResponseEntity.status(401)
                    .body(new AuthResponse(false, e.getMessage(), null, null, null, null));
        }
    }
}
