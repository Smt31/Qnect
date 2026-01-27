package com.example.Qpoint.config;

import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return createCacheConfig(Duration.ofMinutes(10));
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        return (builder) -> builder
                .withCacheConfiguration("users", createCacheConfig(Duration.ofMinutes(30)))
                .withCacheConfiguration("userStats", createCacheConfig(Duration.ofMinutes(30)))
                .withCacheConfiguration("posts", createCacheConfig(Duration.ofMinutes(15)))
                .withCacheConfiguration("topics", createCacheConfig(Duration.ofHours(1)))
                .withCacheConfiguration("trendingTopics", createCacheConfig(Duration.ofMinutes(30)))
                .withCacheConfiguration("news", createCacheConfig(Duration.ofMinutes(30)))
                .withCacheConfiguration("conversations", createCacheConfig(Duration.ofMinutes(10)))
                .withCacheConfiguration("messages", createCacheConfig(Duration.ofMinutes(5)))
                .withCacheConfiguration("comments", createCacheConfig(Duration.ofMinutes(15)))
                .withCacheConfiguration("userConnections", createCacheConfig(Duration.ofMinutes(30)))
                .withCacheConfiguration("userPosts", createCacheConfig(Duration.ofMinutes(15)));
    }

    private RedisCacheConfiguration createCacheConfig(Duration ttl) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);

        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));
    }
}
