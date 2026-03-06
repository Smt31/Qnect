package com.example.Qpoint.config;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

/**
 * Custom UserDetails implementation that wraps username, userId, and role.
 */
@Getter
public class CustomUserDetails implements UserDetails {
    
    private final String username;
    private final Long userId;
    private final String role;
    
    public CustomUserDetails(String username, Long userId, String role) {
        this.username = username;
        this.userId = userId;
        this.role = role != null ? role : "USER";
    }
    
    public CustomUserDetails(String username, Long userId) {
        this(username, userId, "USER");
    }
    
    public CustomUserDetails(String username) {
        this(username, null, "USER");
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_" + role)
        );
    }

    @Override
    public String getPassword() {
        return null; // Not needed for JWT auth
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
