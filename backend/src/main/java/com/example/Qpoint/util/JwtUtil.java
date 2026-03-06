package com.example.Qpoint.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility for issuing and validating JWT access tokens.
 *
 * Requirements implemented:
 * - HS256 signing
 * - 10-hour (configurable) expiration
 * - email as the JWT subject ("sub")
 * - userId and username as custom claims
 * - validation + extraction helpers
 */
@Component
public class JwtUtil {

    private final Key signingKey;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        // Build an HMAC-SHA256 key from the configured secret
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate a signed JWT access token.
     *
     * @param userId   internal user id
     * @param email    user email (will be the JWT subject)
     * @param username username
     * @param ttlMs    time to live in milliseconds
     */
    public String generateToken(Long userId, String email, String username, String role, long ttlMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId);
        claims.put("username", username);
        claims.put("role", role != null ? role : "USER");

        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        Date expiry = new Date(nowMillis + ttlMs);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            Date expiration = claims.getExpiration();
            return expiration == null || expiration.after(new Date());
        } catch (ExpiredJwtException e) {
            return false;
        } catch (JwtException e) {
            return false;
        }
    }
    
    public String extractUsername(String token) {
        Claims claims = parseClaims(token);
        return claims.getSubject();
    }
    
    public boolean validateToken(String token) {
        return isTokenValid(token);
    }
    
    public Long extractUserId(String token) {
        Claims claims = parseClaims(token);
        return claims.get("uid", Long.class);
    }
    
    public String extractUserUsername(String token) {
        Claims claims = parseClaims(token);
        return claims.get("username", String.class);
    }
}


