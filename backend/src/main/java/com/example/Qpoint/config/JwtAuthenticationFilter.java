package com.example.Qpoint.config;

import com.example.Qpoint.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Stateless JWT authentication filter.
 *
 * Extracts Bearer token, validates it, and populates Spring SecurityContext
 * with an Authentication whose principal name is the userId (from "uid" claim),
 * while the JWT subject is the email.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                if (jwtUtil.isTokenValid(token)) {
                    Claims claims = jwtUtil.parseClaims(token);

                    // Extract userId from claims to use as principal name
                    Long userId = claims.get("uid", Long.class);
                    
                    // Extract username from claims for user details
                    String username = (String) claims.get("username");
                    
                    // Fallback to subject (email) if username claim is missing
                    if (username == null) {
                        username = claims.getSubject();
                    }

                    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        String role = claims.get("role", String.class);
                        if (role == null) role = "USER";
                        CustomUserDetails userDetails = new CustomUserDetails(username, userId, role);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (JwtException ex) {
                // Invalid token – leave SecurityContext empty.
                // Spring Security will handle unauthorized access based on config.
            }
        }

        filterChain.doFilter(request, response);
    }
}


