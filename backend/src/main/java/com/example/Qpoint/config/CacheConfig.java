package com.example.Qpoint.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache configuration using Caffeine.
 * 
 * Caching Strategy:
 * - Users: 10 min TTL (frequently accessed for profiles, auth)
 * - Posts/Questions: 5 min TTL (read-heavy, but updates need to reflect)
 * - Topics: 30 min TTL (relatively static data)
 * - Feed: 2 min TTL (personalized, needs fresher data)
 * 
 * NOT cached:
 * - Authentication/OTP (security)
 * - Notifications (real-time)
 * - Write operations
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        
        // Default cache configuration
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats());
        
        return cacheManager;
    }
    
    /**
     * Custom cache configurations for different cache regions.
     * Usage in services:
     * - @Cacheable("users") for user lookups
     * - @Cacheable("posts") for post/question lookups  
     * - @Cacheable("topics") for topic lists
     * - @Cacheable("userStats") for user statistics
     * - @Cacheable("news") for news articles (15 min TTL)
     * - @CacheEvict to invalidate on updates
     */
}
